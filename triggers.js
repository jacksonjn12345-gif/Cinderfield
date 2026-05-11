// ─────────────────────────────────────────
// js/triggers.js
// Only opening trigger active for now
// ─────────────────────────────────────────

const triggers = [
  // all disabled for now except opening
  // add back when story is ready
];

function checkTriggers() {
  triggers.forEach(t => {
    if(t.fired) return;
    const dist = Math.abs(player.tx-t.tx) + Math.abs(player.ty-t.ty);
    if(dist <= t.range) {
      t.fired = true;
      if(t.dialogKey) startDialog(t.dialogKey);
      if(t.item)      addItem(t.item);
    }
  });
}

function resetTrigger(dialogKey) {
  const t = triggers.find(t => t.dialogKey===dialogKey);
  if(t) t.fired = false;
}
