// ─────────────────────────────────────────
// js/player.js
// Fixed walk cycle — legs stride in depth only
// They never move apart horizontally
// ─────────────────────────────────────────

const player = {
  x: 7 * TILE,
  y: 74 * TILE,
  tx: 7, ty: 74,
  dir: 0,
  bodyAngle: -Math.PI / 2,
  moving: false,
  running: false,
  animPhase: 0,
  vx: 0,
  vy: 0,
  // stamina system
  stamina: 60,        // current stamina (frames)
  maxStamina: 60,     // ~1 second of running at 60fps
  staminaDrain: 1,    // per frame while running
  staminaRegen: 0.18, // per frame while not running (regens in ~5 seconds)
  staminaDepleted: false, // locked out until fully recharged
};

const START_BACK_LIMIT_Y = 75 * TILE; // allow full map
const WOODS_EDGE_MARGIN = 18;
const DIR_ANGLES = [-Math.PI/2, -Math.PI/4, 0, Math.PI/4, Math.PI/2, Math.PI*.75, Math.PI, -Math.PI*.75];

function _angleDiff(target, current) {
  let diff = target - current;
  while(diff > Math.PI) diff -= Math.PI * 2;
  while(diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function _bodyTurnDiff(targetDir, currentAngle) {
  const diff = _angleDiff(_dirToAngle(targetDir), currentAngle);

  // Left/right 180s should pass through the front-facing body: A -> S -> D.
  if((targetDir===2 || targetDir===6) && Math.abs(Math.abs(diff) - Math.PI) < 0.001) {
    return targetDir===2 ? -Math.PI : Math.PI;
  }

  return diff;
}

function _dirToAngle(dir) {
  return DIR_ANGLES[dir] ?? -Math.PI / 2;
}

function _angleToDir(angle) {
  let best = 0;
  let bestDiff = Infinity;
  for(let i=0; i<DIR_ANGLES.length; i++) {
    const diff = Math.abs(_angleDiff(angle, DIR_ANGLES[i]));
    if(diff < bestDiff) {
      best = i;
      bestDiff = diff;
    }
  }
  return best;
}

function _angleToBodyDir(angle) {
  const twoPi = Math.PI * 2;
  const a = ((angle % twoPi) + twoPi) % twoPi;
  const dirs = [
    Math.PI * 1.5,  // up
    Math.PI * 1.75, // up-right
    0,              // right
    Math.PI * 0.25, // down-right
    Math.PI * 0.5,  // down
    Math.PI * 0.75, // down-left
    Math.PI,        // left
    Math.PI * 1.25, // up-left
  ];
  let best = 0;
  let bestDiff = Infinity;

  for(let i=0; i<dirs.length; i++) {
    const raw = Math.abs(a - dirs[i]);
    const diff = Math.min(raw, twoPi - raw);
    if(diff < bestDiff) {
      best = i;
      bestDiff = diff;
    }
  }

  return best;
}

function canPlayerStandAt(x, y) {
  if(typeof canStandInShackInterior === 'function' &&
     typeof isInShackInterior === 'function' &&
     isInShackInterior()) {
    return canStandInShackInterior(x, y);
  }

  function isWalkableAt(sx, sy) {
    const tileX = Math.floor(sx / TILE);
    const tileY = Math.floor(sy / TILE);
    if(tileX<0 || tileX>=COLS || tileY<0 || tileY>=ROWS) return false;
    return WALKABLE.has(MAP[tileY][tileX]);
  }

  const center = isWalkableAt(x + 16, y + 29);
  const left = isWalkableAt(x + 12, y + 26);
  const right = isWalkableAt(x + 20, y + 26);

  if((center || left || right) &&
     typeof isShackExteriorBlocked === 'function' &&
     isShackExteriorBlocked(x, y)) {
    return false;
  }

  return center && (left || right);
}

function movePlayer() {
  if(typeof openingIntroActive !== 'undefined' && openingIntroActive) return;
  if(typeof inventoryOpen !== 'undefined' && inventoryOpen) return;
  if(dialogActive || !gameStarted) return;

  // ── STAMINA ──────────────────────────────
  const shiftHeld = !!(keys['Shift']);

  if(shiftHeld && !player.staminaDepleted && player.stamina > 0) {
    player.stamina -= player.staminaDrain;
    if(player.stamina <= 0) {
      player.stamina = 0;
      player.staminaDepleted = true;
      // bleed off run velocity so player doesn't stay stuck at run speed
      player.vx *= 0.3;
      player.vy *= 0.3;
    }
    player.running = true;
  } else {
    player.running = false;
    player.stamina += player.staminaRegen;
    if(player.stamina >= player.maxStamina) {
      player.stamina = player.maxStamina;
      player.staminaDepleted = false;
    }
  }

  // update stamina bar UI
  _updateStaminaBar();

  const speed = player.running ? RUN_SPEED : WALK_SPEED;

  // ── INPUT ────────────────────────────────
  // read keys fresh every frame — fixes stuck movement bug
  const up    = !!(keys['ArrowUp']    || keys['w']);
  const down  = !!(keys['ArrowDown']  || keys['s']);
  const right = !!(keys['ArrowRight'] || keys['d']);
  const left  = !!(keys['ArrowLeft']  || keys['a']);

  let tx=0, ty=0, dir=player.dir;
  if(up && right)        { tx= 1; ty=-1; dir=1; }
  else if(up && left)    { tx=-1; ty=-1; dir=7; }
  else if(down && right) { tx= 1; ty= 1; dir=3; }
  else if(down && left)  { tx=-1; ty= 1; dir=5; }
  else if(up)            { tx= 0; ty=-1; dir=0; }
  else if(down)          { tx= 0; ty= 1; dir=4; }
  else if(right)         { tx= 1; ty= 0; dir=2; }
  else if(left)          { tx=-1; ty= 0; dir=6; }

  if(tx!==0 && ty!==0) { tx*=0.707; ty*=0.707; }

  // target velocity — zero when no keys held
  const targetVX = tx * speed;
  const targetVY = ty * speed;

  player.vx += (targetVX - player.vx) * 0.18;
  player.vy += (targetVY - player.vy) * 0.18;
  if(Math.abs(player.vx)<0.008) player.vx=0;
  if(Math.abs(player.vy)<0.008) player.vy=0;

  player.moving = (Math.abs(player.vx)>0.04 || Math.abs(player.vy)>0.04);
  if(tx!==0||ty!==0) player.dir=dir;
  player.bodyAngle += _bodyTurnDiff(player.dir, player.bodyAngle) * 0.18;

  const nx=player.x+player.vx;
  if(canPlayerStandAt(nx, player.y)) player.x=nx;
  else player.vx=0;

  const ny=player.y+player.vy;
  if(ny <= START_BACK_LIMIT_Y && canPlayerStandAt(player.x, ny)) player.y=ny;
  else player.vy=0;

  if(player.moving) player.animPhase += player.running ? 0.11 : 0.065;

  player.tx=Math.floor(player.x/TILE);
  player.ty=Math.floor(player.y/TILE);
}

// ─────────────────────────────────────────
// DRAW
// ─────────────────────────────────────────
function drawPlayer(sx, sy) {
  ctx.save();
  // 2x pixel density — scale around sprite center
  ctx.translate(sx, sy);

  const s     = player.moving ? Math.sin(player.animPhase) : 0;
  const swing = s * 3.0;
  const bob   = player.moving ? Math.round(Math.abs(s)) : 0;

  const bodyDir = _angleToBodyDir(player.bodyAngle);

  switch(bodyDir) {
    case 0: _dUp(swing,bob);        break;
    case 1: _dUpRight(swing,bob);   break;
    case 2: _dRight(swing,bob);     break;
    case 3: _dDownRight(swing,bob); break;
    case 4: _dDown(swing,bob);      break;
    case 5: _dDownLeft(swing,bob);  break;
    case 6: _dLeft(swing,bob);      break;
    case 7: _dUpLeft(swing,bob);    break;
  }

  ctx.restore();
}

// ═══════════════════════════════════════════
// DIRECTION RENDERERS
//
// LEG RULE: legs are always fixed at x=12
// and x=17. Only their Y position changes
// (depth stride). They NEVER move apart on X.
// Left leg:  y offset = +swing (forward)
// Right leg: y offset = -swing (back)
// This produces a correct human stride.
// ═══════════════════════════════════════════

function _dDown(s, b) {
  _arm(20, 12-b,  s*0.3, '#2e2018', '#513419');
  _legDepth(12, 20,  s);
  _legDepth(16, 20, -s);
  _torsoFront(b);
  _neck(FRONT_NECK_X, FRONT_NECK_Y, '#6f4927');
  _hFrontFlash(b);
  _arm(9, 12-b, -s*0.3, '#221a14', '#6f4927');
}

function _dUp(s, b) {
  _armBack(9,  12-b,  s*0.3);
  _armBack(20, 12-b, -s*0.3);
  _legDepth(12, 20,  s);
  _legDepth(16, 20, -s);
  _torsoBack(b);
  _neck(15, 8-b, '#513419');
  _hFlash(b);
}

function _dRight(s, b) {
  // side view — far arm barely behind torso, near arm just in front
  _legSwing(14, 20,  s*0.16, 1);
  _arm(14, 11-b,  s*0.25, '#1e1408', '#4c3217');  // far arm — dark, behind
  _torsoS(b, 1, false);
  _legSwing(13, 20, -s*0.16, 1);
  _neck(14, 8-b, '#6f4927');
  _hSideFlash(b, 1);
  _arm(15, 11-b, -s*0.25, '#221a14', '#6f4927');  // near arm — in front
}

function _dLeft(s, b) {
  // side view mirrored
  _legSwing(13, 20, -s*0.16, -1);
  _arm(14, 11-b, -s*0.25, '#1e1408', '#4c3217');  // far arm — dark, behind
  _torsoS(b, -1, false);
  _legSwing(12, 20,  s*0.16, -1);
  _neck(13, 8-b, '#6f4927');
  _hSideFlash(b, -1);
  _arm(13, 11-b,  s*0.25, '#221a14', '#6f4927');  // near arm — in front
}

function _dDownRight(s, b) {
  // 3/4 right — one leg visible at a time, close together
  _arm(19, 12,  s*0.25, '#2e2018', '#513419');
  _legSwing(14, 20,  s*0.16, 1);
  _legSwing(13, 20, -s*0.16, 1);
  _torsoS(0, 1, false);
  _neck(FRONT_NECK_X, FRONT_NECK_Y + 1, '#6f4927');
  _hFrontFlash(b);
  _arm(10, 12, -s*0.25, '#221a14', '#6f4927');
}

function _dDownLeft(s, b) {
  // SW — mirror of SE: back arm on right, front arm on left, swings flipped
  _arm(8,  12, -s*0.25, '#2e2018', '#513419');   // back arm — left side
  _legSwing(13, 20, -s*0.16, -1);
  _legSwing(12, 20,  s*0.16, -1);
  _torsoS(0, -1, false);
  _neck(FRONT_NECK_X - 2, FRONT_NECK_Y + 1, '#6f4927');
  _hFrontFlash(b);
  _arm(17, 12,  s*0.25, '#221a14', '#6f4927');   // front arm — right side
}

function _dUpRight(s, b) {
  // NE — back right: near arm left side, far arm right, swings like SE but back-facing
  _armBack(10, 12-b,  s*0.25);   // near arm left
  _legSwing(14, 20,  s*0.16, 1);
  _legSwing(13, 20, -s*0.16, 1);
  _torsoS(b, 1, true);
  _neck(15, 8-b, '#513419');
  _hFlash(b);
  _armBack(19, 12-b, -s*0.25);   // far arm right
}

function _dUpLeft(s, b) {
  // NW — mirror of NE: near arm right side, far arm left, swings flipped
  _armBack(17, 12-b, -s*0.25);   // near arm right
  _legSwing(13, 20, -s*0.16, -1);
  _legSwing(12, 20,  s*0.16, -1);
  _torsoS(b, -1, true);
  _neck(13, 8-b, '#513419');
  _hFlash(b);
  _armBack(8,  12-b,  s*0.25);   // far arm left
}

// ═══════════════════════════════════════════
// LEG PRIMITIVES
// ═══════════════════════════════════════════

// _legDepth — simple y offset, used by up/down/diagonals
function _legDepth(bx, by, oy) {
  const ly = by + oy;
  ctx.fillStyle = '#090b24';
  ctx.fillRect(bx, ly, 4, 6);
  ctx.fillStyle = '#07081b';
  ctx.fillRect(bx, ly+5, 4, 4);
  ctx.fillStyle = '#030411';
  ctx.fillRect(bx+2, ly, 2, 9);
  ctx.fillStyle = '#1a1008';
  ctx.fillRect(bx, ly+9, 4, 2);
  ctx.fillStyle = '#2a1c10';
  ctx.fillRect(bx, ly+9, 4, 1);
}

// _legSwing — pendulum pivot from hip, left/right only
// mirrorX: -1 for left (flips shoe), 1 for right
function _legSwing(bx, by, angle, mirrorX) {
  ctx.save();
  ctx.translate(bx+2, by);
  ctx.rotate(angle);
  if(mirrorX === -1) ctx.scale(-1, 1);
  ctx.fillStyle = '#090b24';
  ctx.fillRect(-2, 0, 4, 6);
  ctx.save();
  ctx.translate(0, 6);
  ctx.rotate(Math.abs(angle) * 0.5);
  ctx.fillStyle = '#07081b';
  ctx.fillRect(-2, 0, 4, 5);
  ctx.fillStyle = '#030411';
  ctx.fillRect(0, 0, 2, 5);
  ctx.fillStyle = '#1a1008';
  ctx.fillRect(-2, 5, 4, 2);
  ctx.fillStyle = '#2a1c10';
  ctx.fillRect(-2, 5, 4, 1);
  ctx.restore();
  ctx.restore();
}

// ═══════════════════════════════════════════
// ARM PRIMITIVES — simple offset
// ═══════════════════════════════════════════

function _arm(ax, ay, sw, sleeve, skin) {
  ctx.fillStyle=sleeve; ctx.fillRect(ax, ay+sw, 3, 6);
  ctx.fillStyle=skin;   ctx.fillRect(ax, ay+5+sw, 3, 5);
}

function _armBack(ax, ay, sw) {
  ctx.fillStyle='#171008'; ctx.fillRect(ax, ay+sw, 3, 6);
  ctx.fillStyle='#513419'; ctx.fillRect(ax, ay+5+sw, 3, 5);
  ctx.fillStyle='#34200f'; ctx.fillRect(ax+1, ay+5+sw, 2, 5);
}

// ═══════════════════════════════════════════
// TORSO PRIMITIVES
// ═══════════════════════════════════════════

function _torsoFront(b) {
  const bx=12, by=11-b;
  // main shirt body
  ctx.fillStyle='#221a14'; ctx.fillRect(bx,by,8,10);
  // plaid verticals
  ctx.fillStyle='#342618'; ctx.fillRect(bx+3,by,1,10);
  ctx.fillStyle='#342618'; ctx.fillRect(bx+6,by,1,10);
  // plaid horizontals
  ctx.fillStyle='#3c2e1e'; ctx.fillRect(bx,by+3,8,1);
  ctx.fillStyle='#3c2e1e'; ctx.fillRect(bx,by+7,8,1);
  // left highlight
  ctx.fillStyle='#2f231a'; ctx.fillRect(bx,by,2,5);
  ctx.fillStyle='#2b2018'; ctx.fillRect(bx+2,by,1,3);
  // right shadow
  ctx.fillStyle='#171008'; ctx.fillRect(bx+5,by,3,10);
  ctx.fillStyle='#100b07'; ctx.fillRect(bx+7,by,1,10);
  // belt + buckle
  ctx.fillStyle='#181208'; ctx.fillRect(bx,by+10,8,2);
  ctx.fillStyle='#3a2e10'; ctx.fillRect(bx+3,by+10,2,2);
  // collar open at neck
  ctx.fillStyle='#2a1e12'; ctx.fillRect(bx+3,by,2,3);
  // shirt button line
  ctx.fillStyle='#3e2e1e'; ctx.fillRect(bx+3,by+3,1,7);
  ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(bx,by+7,8,3);
}

function _torsoBack(b) {
  const bx=12, by=11-b;
  ctx.fillStyle='#221a14'; ctx.fillRect(bx,by,8,10);
  ctx.fillStyle='#21170f'; ctx.fillRect(bx,by,8,2);
  ctx.fillStyle='#30241b'; ctx.fillRect(bx,by+2,2,6);
  ctx.fillStyle='#241912'; ctx.fillRect(bx+6,by+2,2,8);
  ctx.fillStyle='#2a1d14'; ctx.fillRect(bx+3,by,2,10);
  ctx.fillStyle='#3c2e1e'; ctx.fillRect(bx,by+4,8,1);
  ctx.fillStyle='#2c2118'; ctx.fillRect(bx,by+7,8,1);
  ctx.fillStyle='#181208'; ctx.fillRect(bx,by+10,8,2);
  ctx.fillStyle='#1f160d'; ctx.fillRect(bx+3,by+10,2,2);
  ctx.fillStyle='rgba(0,0,0,0.24)'; ctx.fillRect(bx,by+6,8,4);
}

function _torsoS(b, d, back=false) {
  const bx=d===1?13:11, by=11-b;
  ctx.fillStyle=back ? '#211812' : '#221a14'; ctx.fillRect(bx,by,6,10);
  ctx.fillStyle=back ? '#21170f' : '#342618'; ctx.fillRect(bx+2,by,1,10);
  ctx.fillStyle=back ? '#2c2118' : '#3c2e1e'; ctx.fillRect(bx,by+4,6,1);
  if(d===1){
    ctx.fillStyle=back ? '#261c15' : '#2f231a'; ctx.fillRect(bx,by,2,5);
    ctx.fillStyle=back ? '#1f160f' : '#2e2018'; ctx.fillRect(bx+4,by,2,10);
  } else {
    ctx.fillStyle=back ? '#1f160f' : '#2e2018'; ctx.fillRect(bx,by,2,10);
    ctx.fillStyle=back ? '#261c15' : '#2f231a'; ctx.fillRect(bx+4,by,2,5);
  }
  ctx.fillStyle='#181208'; ctx.fillRect(bx,by+10,6,2);
  ctx.fillStyle='#3a2e10'; ctx.fillRect(bx+2,by+10,2,2);
  ctx.fillStyle='rgba(0,0,0,0.24)'; ctx.fillRect(bx,by+6,6,4);
}

let _lastNeck = { x: 14, y: 6 };
const HEAD_Y_DROP = 2;
const NECK_W = 2;
const FRONT_NECK_X = 15;
const FRONT_NECK_Y = 8;

function _neck(nx, ny, color) {
  _lastNeck = { x: nx, y: ny };
  ctx.fillStyle=color;
  ctx.fillRect(_lastNeck.x, _lastNeck.y, NECK_W, 3);
}

// ═══════════════════════════════════════════
// HEAD PRIMITIVES — full sprite-based redesign
// Explicit 8-direction head sprites.
// This replaces the old procedural head drawing.
// ═══════════════════════════════════════════

function _flashlightDir() {
  const angle = (typeof flashlight === 'object' && Number.isFinite(flashlight.angle))
    ? flashlight.angle
    : -Math.PI / 2;

  const dirs = [
    -Math.PI / 2,      // 0 up
    -Math.PI / 4,      // 1 up-right
    0,                 // 2 right
    Math.PI / 4,       // 3 down-right
    Math.PI / 2,       // 4 down
    Math.PI * 0.75,    // 5 down-left
    Math.PI,           // 6 left
    -Math.PI * 0.75,   // 7 up-left
  ];

  let best = 0;
  let bestDiff = Infinity;

  for (let i = 0; i < dirs.length; i++) {
    let diff = angle - dirs[i];
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    diff = Math.abs(diff);

    if (diff < bestDiff) {
      best = i;
      bestDiff = diff;
    }
  }

  return best;
}

// neck center based on BODY direction — must match _neck(nx,...) calls exactly
// neck fill is fillRect(nx, ny, 4, 3), so center = nx + 2
function _headNeckCenterX() {
  return _lastNeck.x + Math.ceil(NECK_W / 2);
  switch (player.dir) {
    case 2: return 16; // right     — _neck(14,...) → x=14-17, center=16
    case 3: return 17; // down-right — _neck(15,...) → x=15-18, center=17
    case 1: return 17; // up-right   — _neck(15,...) → x=15-18, center=17
    case 5: return 15; // down-left  — _neck(13,...) → x=13-16, center=15
    case 6: return 15; // left       — _neck(13,...) → x=13-16, center=15
    case 7: return 15; // up-left   — _neck(13,...) → x=13-16, center=15
    case 0:
    case 4:
    default:
      return 16;       // up/down — _neck(14,...) → x=14-17, center=16
  }
}

const HEAD_PALETTE = {
  H: '#1e1610', // dark hair
  h: '#2a2016', // hair midtone / parting
  s: '#6f4927', // skin base
  j: '#5f3d20', // jaw warm shadow
  d: '#513419', // deep shadow
  l: '#89592f', // face highlight
  e: '#4f3017', // ear / side face
  n: '#654120', // neck skin
};

// Pixel sprites — 10 wide x 8 tall grid
// anchorX = the sprite column that sits over neck center (cx)
// hx = cx - anchorX  →  row 7 neck pixels land exactly on _neck() fill
// . = transparent
const HEAD_POSES = {

  // ── FACING DOWN ──────────────────────────
  // cx=16, anchorX=5, hx=11, head spans x=11-21
  // neck fill x=14-17 → row7 cols 3-6 → x=14-17 ✓
  down: {
    anchorX: 5,
    neckRow: 6,
    sprite: [
      "..hHHHHh..",
      ".HHssssHH.",
      "HHssssssHH",
      "HHssssssHH",
      "HHssssssHH",
      ".HjjjjjjH.",
      "..HjjjjH..",
      "...nnnn...",
    ],
  },

  // ── FACING UP ────────────────────────────
  // cx=16, anchorX=5, hx=11
  // neck fill x=14-17 → row7 cols 3-6 → x=14-17 ✓
  up: {
    anchorX: 5,
    neckRow: 8,
    sprite: [
      "....hHh...",
      "..hHHHHh..",
      ".HHHHHHHh.",
      "HHHHHHHHHH",
      "HHHHhHHHHH",
      "HHHHhhHHHH",
      ".HHHHHHHH.",
      "..hHHHHh..",
      "...nnnn...",
    ],
  },

  // ── RIGHT PROFILE ────────────────────────
  // cx=18, anchorX=4, hx=14, head spans x=14-24
  // neck fill x=16-19 → row7 cols 2-5 → x=16-19 ✓
  // hair mass x=14-18 (over torso), face only 3-4px wide at x=18-22
  right: {
    anchorX: 4,
    neckRow: 8,
    sprite: [
      "..hHHh....",
      ".hHHHHh...",
      ".HHHHHHH..",
      "HHHHHssse.",
      "HHHHHssle.",
      ".HHHsssj.",
      ".HHHssjd.",
      "..HHHjd...",
      "..nnnn....",
    ],
  },

  // ── LEFT PROFILE ─────────────────────────
  // cx=15, anchorX=6, hx=9, head spans x=9-19
  // neck fill x=13-16 → row7 cols 4-7 → x=13-16 ✓
  // exact character mirror of right sprite; row7 adjusted for actual neck position
  // ear 'e' at col 1 → x=10 gives visible sideburn
  left: {
    anchorX: 6,
    neckRow: 8,
    sprite: [
      "....hHHh..",
      "...hHHHHh.",
      "..HHHHHHH.",
      ".esssHHHHH",
      ".elssHHHHH",
      ".jsssHHH..",
      ".djssHHH..",
      "...djHHH..",
      "....nnnn..",
    ],
  },

  // ── FRONT 3/4 RIGHT ──────────────────────
  // cx=17, anchorX=5, hx=12, head spans x=12-22
  // neck fill x=15-18 → row7 cols 3-6 → x=15-18 ✓
  rightUp: {
    anchorX: 4,
    neckRow: 8,
    yOffset: 0,
    sprite: [
      "...hHHh...",
      "..hHHHHH..",
      ".HHHHHHHH.",
      "HHHHHHHHH.",
      "HHHHHHHHH.",
      ".HHHHHHhe.",
      "..HHHHHse.",
      "...HHHjd..",
      "..nnnn....",
    ],
  },

  rightDown: {
    anchorX: 4,
    neckRow: 8,
    yOffset: 0,
    sprite: [
      "..hHHh....",
      ".hHHHHh...",
      ".HHHHHHh..",
      "HHHHsssse.",
      "HHHssssle.",
      ".HHHsssjd.",
      ".HHHssjdd.",
      "..HHHjdd..",
      "..nnnn....",
    ],
  },

  leftUp: {
    anchorX: 6,
    neckRow: 8,
    yOffset: 0,
    sprite: [
      "...hHHh...",
      "..HHHHHh..",
      ".HHHHHHHH.",
      ".HHHHHHHHH",
      ".HHHHHHHHH",
      ".ehHHHHHH.",
      ".esHHHHH..",
      "..djHHH...",
      "....nnnn..",
    ],
  },

  leftDown: {
    anchorX: 6,
    neckRow: 8,
    yOffset: 0,
    sprite: [
      "....hHHh..",
      "...hHHHHh.",
      "..hHHHHHH.",
      ".essssHHHH",
      ".elssssHHH",
      ".djsssHHH.",
      ".ddjssHHH.",
      "..ddjHHH..",
      "....nnnn..",
    ],
  },

  downRight: {
    anchorX: 5,
    neckRow: 6,
    sprite: [
      "..hHHHHh..",
      ".HHHHssH..",
      "HHHlssssel",
      "HHHssssssl",
      "HHHssssssH",
      ".HjjjjjjH.",
      "..HjjjjH..",
      "...nnnn...",
    ],
  },

  // ── FRONT 3/4 LEFT ───────────────────────
  // cx=15, anchorX=5, hx=10, head spans x=10-20
  // neck fill x=13-16 → row7 cols 3-6 → x=13-16 ✓
  // mirror of downRight
  downLeft: {
    anchorX: 5,
    neckRow: 6,
    sprite: [
      "..hHHHHh..",
      "..HssHHHH.",
      "lesssslHHH",
      "lssssssHHH",
      "HssssssHHH",
      ".HjjjjjjH.",
      "..HjjjjH..",
      "...nnnn...",
    ],
  },

  // ── BACK 3/4 RIGHT ───────────────────────
  // cx=17, anchorX=5, hx=12, head spans x=12-22
  // neck fill x=15-18 → row7 cols 3-6 → x=15-18 ✓
  // ear sliver visible on right edge
  upRight: {
    anchorX: 5,
    neckRow: 8,
    xOffset: 0,
    sprite: [
      "...hHHhh..",
      "..hHHHHhh.",
      ".HHHHHHHh.",
      "HHHHHHHHHH",
      "HHHHhHHHHH",
      "HHHhhhHHHe",
      ".HHHHHHHse",
      "..hHHHHHe.",
      "...nnnn...",
    ],
  },

  // ── BACK 3/4 LEFT ────────────────────────
  // cx=16, anchorX=5, hx=11, head spans x=11-21
  // neck fill x=14-17 → row7 cols 3-6 → x=14-17 ✓
  // mirror of upRight
  upLeft: {
    anchorX: 5,
    neckRow: 8,
    xOffset: 0,
    sprite: [
      ".hhHHh....",
      ".hhHHHHh..",
      ".hHHHHHHH.",
      "HHHHHHHHHH",
      "HHHHHhHHHH",
      "eHHHhhhHHH",
      "esHHHHHHH.",
      ".eHHHHhh..",
      "...nnnn...",
    ],
  },
};

const _headSpriteCache = {};

function _headSpriteCanvas(name) {
  if(_headSpriteCache[name]) return _headSpriteCache[name];

  const pose = HEAD_POSES[name];
  if(!pose) return null;

  const c = document.createElement('canvas');
  c.width = pose.sprite[0].length;
  c.height = pose.sprite.length;
  const cx = c.getContext('2d');

  for (let row = 0; row < pose.sprite.length; row++) {
    const line = pose.sprite[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === '.' || ch === 'n') continue;

      const color = HEAD_PALETTE[ch];
      if (!color) continue;

      cx.fillStyle = color;
      cx.fillRect(col, row, 1, 1);
    }
  }

  _headSpriteCache[name] = c;
  return c;
}

function _drawHeadSprite(sprite, x, y) {
  for (let row = 0; row < sprite.length; row++) {
    const line = sprite[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === '.' || ch === 'n') continue;

      const color = HEAD_PALETTE[ch];
      if (!color) continue;

      ctx.fillStyle = color;
      ctx.fillRect(x + col, y + row, 1, 1);
    }
  }
}

function _drawHeadPose(name, b, cx) {
  const pose = HEAD_POSES[name];
  if (!pose) return;

  const headBob = 0;
  const hy = _lastNeck.y - pose.neckRow + HEAD_Y_DROP + (pose.yOffset || 0) + headBob;
  const hx = cx - pose.anchorX + (pose.xOffset || 0);
  const spriteCanvas = _headSpriteCanvas(name);

  if(spriteCanvas) ctx.drawImage(spriteCanvas, hx, hy);
}

function _frontHeadCenterX() {
  const cx = _headNeckCenterX();
  if(player.dir===3) return cx - 1;
  if(player.dir===5) return cx + 1;
  return cx;
}

function _hFlash(b, lockPose=null) {
  const cx = _headNeckCenterX();

  if(lockPose) {
    _drawHeadPose(lockPose, b, cx);
    return;
  }

  switch (_flashlightDir()) {
    case 0: _drawHeadPose('up', b, cx); break;
    case 1: _drawHeadPose('upRight', b, cx); break;
    case 2: _drawHeadPose('right', b, cx); break;
    case 3: _drawHeadPose('downRight', b, cx); break;
    case 4: _drawHeadPose('down', b, cx); break;
    case 5: _drawHeadPose('downLeft', b, cx); break;
    case 6: _drawHeadPose('left', b, cx); break;
    case 7: _drawHeadPose('upLeft', b, cx); break;
  }
}

// ─────────────────────────────────────────
// STAMINA BAR UI
// ─────────────────────────────────────────
function _hFrontFlash(b) {
  const cx = _frontHeadCenterX();
  const qHeld = !!(keys['q'] || keys['Q']);
  const eHeld = !!(keys['e'] || keys['E']);

  if(player.dir===3) {
    _drawHeadPose('rightDown', b, cx);
  } else if(player.dir===5) {
    _drawHeadPose('leftDown', b, cx);
  } else if(qHeld && !eHeld) {
    _drawHeadPose('downRight', b, cx);
  } else if(eHeld && !qHeld) {
    _drawHeadPose('downLeft', b, cx);
  } else {
    _drawHeadPose('down', b, cx);
  }
}

function _hSideFlash(b, side) {
  const cx = _headNeckCenterX();
  const qHeld = !!(keys['q'] || keys['Q']);
  const eHeld = !!(keys['e'] || keys['E']);

  if(side > 0) {
    if(qHeld && !eHeld) _drawHeadPose('rightUp', b, cx);
    else if(eHeld && !qHeld) _drawHeadPose('rightDown', b, cx);
    else _drawHeadPose('right', b, cx);
  } else {
    if(qHeld && !eHeld) _drawHeadPose('leftDown', b, cx);
    else if(eHeld && !qHeld) _drawHeadPose('leftUp', b, cx);
    else _drawHeadPose('left', b, cx);
  }
}

let _lastStaminaWidth = '';
let _lastStaminaColor = '';

function _updateStaminaBar() {
  const bar = document.getElementById('stamina-fill');
  if(!bar) return;
  const pct = player.stamina / player.maxStamina;
  const width = Math.round(pct * 100) + '%';
  if(width !== _lastStaminaWidth) {
    bar.style.width = width;
    _lastStaminaWidth = width;
  }
  // colour: grey when depleted, dim amber when low, faint when full
  let color;
  if(player.staminaDepleted) {
    color = '#2a1a0a';
  } else if(pct < 0.3) {
    color = '#6a3a10';
  } else {
    color = '#3a2a10';
  }
  if(color !== _lastStaminaColor) {
    bar.style.background = color;
    _lastStaminaColor = color;
  }
}
