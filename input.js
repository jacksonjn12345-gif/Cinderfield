// ─────────────────────────────────────────
// js/input.js
// Q and E are held keys — fog.js reads
// keys['q'] directly each frame
// ─────────────────────────────────────────

const keys      = {};
let justPressed = {};
const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'w', 'a', 's', 'd', 'W', 'A', 'S', 'D',
  'q', 'e', 'Q', 'E', 'r', 'R',
  'i', 'I', 'Tab',
  'Shift', ' ', 'Enter',
]);

window.addEventListener('keydown', e => {
  if(!keys[e.key]) justPressed[e.key] = true;
  keys[e.key] = true;
  if(GAME_KEYS.has(e.key)) e.preventDefault();
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
  if(e.key.length === 1) {
    keys[e.key.toUpperCase()] = false;
    keys[e.key.toLowerCase()] = false;
  }
});

window.addEventListener('blur', () => {
  Object.keys(keys).forEach(key => keys[key] = false);
  clearJustPressed();
});

function clearJustPressed() {
  justPressed = {};
}

function isJustPressed(key) {
  return !!justPressed[key];
}

function isHeld(key) {
  return !!keys[key];
}
