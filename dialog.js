// ─────────────────────────────────────────
// js/dialog.js
// ─────────────────────────────────────────

const DIALOGS = {
  start: [
    "The car is somewhere behind him.\nHe stopped driving when the road did.",
    "The trees are close. The path is narrow.\nHe turns the flashlight on.",
    "She said she would be here.\nHe doesn't know why he believed her.",
    "He walks.",
  ],
  switchblade: [
    "Not sure why I'm taking this.",
  ],
};

let dialogActive  = false;
let dialogQueue   = [];
let typingText    = '';
let typingIndex   = 0;
let typingDone    = false;
let typingTimer   = 0;
const TYPING_SPEED = 2;

const dialogEl = document.getElementById('dialog');
const dtextEl  = document.getElementById('dtext');

function startDialog(key) {
  if(dialogActive || !DIALOGS[key]) return;
  dialogQueue  = [...DIALOGS[key]];
  dialogActive = true;
  dialogEl.style.display = 'block';
  showNextLine();
}

function showNextLine() {
  if(dialogQueue.length===0) {
    dialogActive = false;
    dialogEl.style.display = 'none';
    return;
  }
  typingText  = dialogQueue.shift();
  typingIndex = 0;
  typingDone  = false;
  dtextEl.textContent = '';
}

function advanceDialog() {
  if(!dialogActive) return;
  if(!typingDone) {
    dtextEl.textContent = typingText;
    typingIndex = typingText.length;
    typingDone  = true;
  } else {
    showNextLine();
  }
}

function updateDialog() {
  if(!dialogActive || typingDone) return;
  typingTimer++;
  if(typingTimer % TYPING_SPEED === 0 && typingIndex < typingText.length) {
    typingIndex++;
    dtextEl.textContent = typingText.slice(0, typingIndex);
    if(typingIndex >= typingText.length) typingDone = true;
  }
}
