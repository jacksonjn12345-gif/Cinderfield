// ─────────────────────────────────────────
// js/radio.js
// Edit this file to change:
//   - What the radio says
//   - How often it changes
//   - Whether it reacts to Witnesses nearby
// ─────────────────────────────────────────

// ── RADIO MESSAGES ────────────────────────
// These cycle through at random intervals.
// Add your own lines to make the radio feel
// more specific to where Jackson is.
const RADIO_MSGS = [
  'no signal',
  '...',
  '... witnesses ...',
  '... she is here ...',
  'no signal',
  '... stay ...',
  '...',
  '... you know this place ...',
  'no signal',
  '... not yet ...',
  '...',
  '... the school ...',
];

let radioIndex  = 0;
let radioTimer  = 0;
const RADIO_INTERVAL = 220; // frames between changes (~3.5 seconds at 60fps)

const radioEl = document.getElementById('radioMsg');

// ─────────────────────────────────────────
// updateRadio — call each frame from main.js
// ─────────────────────────────────────────
function updateRadio() {
  radioTimer++;
  if(radioTimer >= RADIO_INTERVAL) {
    radioTimer = 0;
    radioIndex = (radioIndex + 1) % RADIO_MSGS.length;

    // fade out, change text, fade in
    radioEl.style.transition = 'opacity 0.3s';
    radioEl.style.opacity = '0';
    setTimeout(() => {
      radioEl.textContent = RADIO_MSGS[radioIndex];
      radioEl.style.opacity = '1';
    }, 300);
  }
}

// ─────────────────────────────────────────
// setRadioMessage — force a specific message
// e.g. setRadioMessage('... she is close ...')
// ─────────────────────────────────────────
function setRadioMessage(msg) {
  radioEl.style.transition = 'opacity 0.2s';
  radioEl.style.opacity = '0';
  setTimeout(() => {
    radioEl.textContent = msg;
    radioEl.style.opacity = '1';
  }, 200);
}
