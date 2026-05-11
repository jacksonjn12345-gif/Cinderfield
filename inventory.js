// js/inventory.js

let inventory = [];
let inventoryOpen = false;
let selectedCaseItem = null;
let draggedCaseItem = null;
let droppedCaseItem = null;
let caseDragAnchor = { x: 0, y: 0 };

const invEl = document.getElementById('invMsg');
const inventoryScreenEl = document.getElementById('inventory-screen');
const caseGridEl = document.getElementById('case-grid');
const caseItemNameEl = document.getElementById('case-item-name');
const caseItemDescEl = document.getElementById('case-item-desc');

const CASE_COLS = 5;
const CASE_ROWS = 4;
const CASE_ITEMS = {
  switchblade: {
    label: 'switchblade',
    desc: 'Open. Dusty. Still sharp enough.',
    x: 1,
    y: 1,
    w: 2,
    h: 1,
    homeW: 2,
    homeH: 1,
    rotated: false,
    rotatable: true,
  },
};

function addItem(name) {
  if(inventory.includes(name)) return;
  inventory.push(name);
  updateInventoryUI();
  renderInventoryCase();
}

function hasItem(name) {
  return inventory.includes(name);
}

function removeItem(name) {
  inventory = inventory.filter(i => i !== name);
  updateInventoryUI();
  renderInventoryCase();
}

function updateInventoryUI() {
  invEl.textContent = inventory.length > 0
    ? inventory.join(' / ')
    : 'empty';
}

function toggleInventoryScreen() {
  setInventoryOpen(!inventoryOpen);
}

function setInventoryOpen(open) {
  inventoryOpen = open;
  if(!inventoryOpen) {
    draggedCaseItem = null;
    droppedCaseItem = null;
  }
  if(inventoryScreenEl) inventoryScreenEl.style.display = inventoryOpen ? 'flex' : 'none';
  if(inventoryOpen) renderInventoryCase();
}

function renderInventoryCase() {
  if(!caseGridEl) return;

  caseGridEl.innerHTML = '';
  caseGridEl.style.gridTemplateColumns = `repeat(${CASE_COLS}, 1fr)`;
  caseGridEl.style.gridTemplateRows = `repeat(${CASE_ROWS}, 1fr)`;

  for(let i=0; i<CASE_COLS * CASE_ROWS; i++) {
    const cell = document.createElement('div');
    cell.className = 'case-cell';
    caseGridEl.appendChild(cell);
  }

  inventory.forEach(name => {
    const item = CASE_ITEMS[name];
    if(!item) return;

    const el = document.createElement('div');
    el.className = [
      'case-item',
      `case-item-${name}`,
      item.rotated ? 'case-item-vertical' : '',
      selectedCaseItem === name ? 'selected' : '',
      draggedCaseItem === name ? 'dragging' : '',
      droppedCaseItem === name ? 'dropped' : '',
    ].filter(Boolean).join(' ');
    el.style.gridColumn = `${item.x + 1} / span ${item.w}`;
    el.style.gridRow = `${item.y + 1} / span ${item.h}`;
    el.setAttribute('aria-label', item.label);
    el.dataset.item = name;
    el.innerHTML = name === 'switchblade'
      ? _switchbladeIconMarkup()
      : `<span>${item.label}</span>`;
    el.addEventListener('mouseenter', () => setCaseInfo(item));
    el.addEventListener('pointerdown', e => beginCaseDrag(e, name));
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      selectedCaseItem = name;
      rotateSelectedCaseItem();
    });
    caseGridEl.appendChild(el);
  });

  const firstItem = inventory.map(name => CASE_ITEMS[name]).find(Boolean);
  setCaseInfo(firstItem || null);
}

function beginCaseDrag(e, name) {
  if(!inventoryOpen) return;
  e.preventDefault();
  selectedCaseItem = name;
  draggedCaseItem = name;
  const item = CASE_ITEMS[name];
  const pointerCell = Number.isFinite(e.clientX) && Number.isFinite(e.clientY)
    ? _casePointerToCell(e.clientX, e.clientY)
    : { x: item.x, y: item.y };
  caseDragAnchor = {
    x: Math.max(0, Math.min(item.w - 1, pointerCell.x - item.x)),
    y: Math.max(0, Math.min(item.h - 1, pointerCell.y - item.y)),
  };
  setCaseInfo(CASE_ITEMS[name]);
  renderInventoryCase();
}

function rotateSelectedCaseItem() {
  if(!selectedCaseItem) selectedCaseItem = inventory.find(name => CASE_ITEMS[name]) || null;
  if(!selectedCaseItem) return false;
  return rotateCaseItem(selectedCaseItem);
}

function rotateCaseItem(name) {
  const item = CASE_ITEMS[name];
  if(!item || !item.rotatable) return false;

  const nextW = item.h;
  const nextH = item.w;
  const nextX = Math.min(item.x, CASE_COLS - nextW);
  const nextY = Math.min(item.y, CASE_ROWS - nextH);

  if(!isCasePlacementValid(name, nextX, nextY, nextW, nextH)) return false;
  item.x = nextX;
  item.y = nextY;
  item.w = nextW;
  item.h = nextH;
  item.rotated = !item.rotated;
  renderInventoryCase();
  return true;
}

function moveCaseItemToPointer(name, clientX, clientY) {
  const item = CASE_ITEMS[name];
  if(!item || !caseGridEl) return false;

  const pos = _casePointerToCell(clientX, clientY);
  const x = Math.max(0, Math.min(CASE_COLS - item.w, pos.x - caseDragAnchor.x));
  const y = Math.max(0, Math.min(CASE_ROWS - item.h, pos.y - caseDragAnchor.y));
  if(!isCasePlacementValid(name, x, y, item.w, item.h)) return false;

  item.x = x;
  item.y = y;
  renderInventoryCase();
  return true;
}

function isCasePlacementValid(name, x, y, w, h) {
  if(x < 0 || y < 0 || x + w > CASE_COLS || y + h > CASE_ROWS) return false;

  return inventory.every(otherName => {
    if(otherName === name) return true;
    const other = CASE_ITEMS[otherName];
    if(!other) return true;
    return x + w <= other.x || other.x + other.w <= x ||
           y + h <= other.y || other.y + other.h <= y;
  });
}

function _casePointerToCell(clientX, clientY) {
  const rect = caseGridEl.getBoundingClientRect();
  const cellW = rect.width / CASE_COLS;
  const cellH = rect.height / CASE_ROWS;
  return {
    x: Math.floor((clientX - rect.left) / cellW),
    y: Math.floor((clientY - rect.top) / cellH),
  };
}

window.addEventListener('pointermove', e => {
  if(!draggedCaseItem || !inventoryOpen) return;
  moveCaseItemToPointer(draggedCaseItem, e.clientX, e.clientY);
});

window.addEventListener('pointerup', () => {
  if(draggedCaseItem) {
    droppedCaseItem = draggedCaseItem;
    draggedCaseItem = null;
    renderInventoryCase();
    setTimeout(() => {
      droppedCaseItem = null;
      renderInventoryCase();
    }, 150);
    return;
  }
  draggedCaseItem = null;
});

function setCaseInfo(item) {
  if(!caseItemNameEl || !caseItemDescEl) return;
  caseItemNameEl.textContent = item ? item.label : 'empty';
  caseItemDescEl.textContent = item ? item.desc : 'Nothing useful.';
}

function _switchbladeIconMarkup() {
  return `
    <div class="switchblade-icon">
      <div class="switchblade-art">
        <span class="blade-main"></span>
        <span class="blade-shadow"></span>
        <span class="blade-edge"></span>
        <span class="knife-handle"></span>
        <span class="knife-grip"></span>
        <span class="knife-bolster"></span>
        <span class="knife-pin"></span>
      </div>
    </div>
  `;
}
