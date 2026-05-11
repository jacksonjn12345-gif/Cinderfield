// js/shack.js
// A small abandoned hunting shack placed near the long straight path.

const SHACK = {
  worldX: 17 * TILE,
  worldY: 14 * TILE,
  worldW: 4 * TILE,
  worldH: 3 * TILE,
  doorX: 17 * TILE + 56,
  doorY: 14 * TILE + 72,
  inside: false,
  tookSwitchblade: false,
  transitionCooldown: 0,
  transitionFade: 0,
  exteriorImg: null,
  outsideReturn: null,
  room: {
    x: 126,
    y: 66,
    w: 260,
    h: 174,
    doorX: 126,
    doorY: 154,
    knifeX: 327,
    knifeY: 102,
  },
};

function isInShackInterior() {
  return SHACK.inside;
}

function isShackBlockingTree(c, r) {
  const left = Math.floor(SHACK.worldX / TILE) - 2;
  const right = Math.ceil((SHACK.worldX + SHACK.worldW) / TILE) + 1;
  const top = Math.floor(SHACK.worldY / TILE) - 2;
  const bottom = Math.ceil((SHACK.worldY + SHACK.worldH) / TILE) + 1;
  return c >= left && c <= right && r >= top && r <= bottom;
}

function buildShackDepthProp() {
  if(!SHACK.exteriorImg) SHACK.exteriorImg = _renderShackExterior();
  return {
    img: SHACK.exteriorImg,
    x: SHACK.worldX - 12,
    y: SHACK.worldY - 36,
    depthY: SHACK.worldY + SHACK.worldH - 4,
    depthX: SHACK.worldX,
  };
}

function _renderShackExterior() {
  const c = document.createElement('canvas');
  c.width = 156;
  c.height = 138;
  const cx = c.getContext('2d');

  cx.fillStyle = 'rgba(2,3,2,0.6)';
  cx.fillRect(21, 112, 115, 8);
  cx.fillRect(12, 122, 132, 5);
  cx.fillStyle = 'rgba(0,0,0,0.34)';
  cx.fillRect(47, 116, 72, 5);

  // Slight top-down roof plane.
  cx.fillStyle = 'rgb(11,9,7)';
  cx.beginPath();
  cx.moveTo(31, 35);
  cx.lineTo(124, 37);
  cx.lineTo(138, 58);
  cx.lineTo(19, 58);
  cx.closePath();
  cx.fill();
  cx.fillStyle = 'rgb(23,17,11)';
  cx.beginPath();
  cx.moveTo(25, 55);
  cx.lineTo(131, 55);
  cx.lineTo(127, 70);
  cx.lineTo(28, 70);
  cx.closePath();
  cx.fill();
  cx.fillStyle = 'rgb(8,7,6)';
  cx.fillRect(20, 58, 116, 4);
  for(let x=28; x<126; x+=13) {
    cx.fillStyle = x % 26 === 0 ? 'rgb(18,14,10)' : 'rgb(9,8,6)';
    cx.fillRect(x, 41 + (x%3), 2, 16);
  }
  cx.fillStyle = 'rgb(31,23,15)';
  cx.fillRect(42, 48, 27, 2);
  cx.fillStyle = 'rgb(6,5,4)';
  cx.fillRect(94, 53, 18, 2);
  cx.fillStyle = 'rgb(30,22,14)';
  cx.fillRect(29, 62, 31, 2);
  cx.fillRect(74, 64, 45, 2);
  cx.fillStyle = 'rgb(7,6,5)';
  cx.fillRect(63, 38, 2, 19);
  cx.fillRect(118, 43, 2, 14);

  // Near wall: broad front face like the character's front-facing stance.
  cx.fillStyle = 'rgb(25,20,15)';
  cx.fillRect(25, 70, 106, 42);
  cx.fillStyle = 'rgb(16,13,10)';
  cx.fillRect(25, 62, 10, 50);
  cx.fillRect(121, 62, 10, 50);
  cx.fillStyle = 'rgb(12,10,8)';
  cx.fillRect(25, 70, 106, 3);
  cx.fillRect(25, 109, 106, 3);

  for(let y=73; y<110; y+=8) {
    cx.fillStyle = y % 16 === 0 ? 'rgb(34,26,18)' : 'rgb(28,22,16)';
    cx.fillRect(27, y, 102, 4);
    cx.fillStyle = 'rgb(11,9,7)';
    cx.fillRect(27, y+4, 102, 1);
  }
  cx.fillStyle = 'rgb(45,33,21)';
  cx.fillRect(33, 77, 18, 1);
  cx.fillRect(88, 101, 24, 1);
  cx.fillStyle = 'rgb(9,7,5)';
  cx.fillRect(64, 72, 2, 38);
  cx.fillRect(116, 70, 2, 40);
  cx.fillStyle = 'rgb(18,13,9)';
  cx.fillRect(36, 89, 20, 2);
  cx.fillRect(93, 82, 17, 1);
  cx.fillStyle = 'rgb(52,38,24)';
  cx.fillRect(41, 75, 3, 2);
  cx.fillRect(72, 103, 2, 2);
  cx.fillRect(124, 92, 2, 2);

  for(let i=0; i<20; i++) {
    const x = 30 + (i*17)%92;
    const y = 72 + (i*19)%36;
    cx.fillStyle = i % 3 === 0 ? 'rgb(42,31,20)' : 'rgb(11,9,7)';
    cx.fillRect(x, y, 5 + (i%4), 1);
  }

  cx.fillStyle = 'rgb(7,8,7)';
  cx.fillRect(106, 75, 17, 15);
  cx.fillStyle = 'rgb(33,28,22)';
  cx.fillRect(108, 77, 13, 11);
  cx.fillStyle = 'rgba(5,6,5,0.78)';
  cx.fillRect(109, 78, 11, 9);
  cx.fillStyle = 'rgb(27,22,16)';
  cx.fillRect(110, 79, 9, 4);
  cx.fillStyle = 'rgb(15,11,8)';
  cx.fillRect(106, 88, 17, 3);
  cx.fillStyle = 'rgb(43,31,20)';
  cx.fillRect(109, 75, 3, 16);

  // Front-facing ajar door.
  cx.fillStyle = 'rgb(5,4,3)';
  cx.fillRect(53, 79, 31, 33);
  cx.fillStyle = 'rgba(0,0,0,0.42)';
  cx.fillRect(57, 84, 21, 28);
  cx.fillStyle = 'rgb(39,29,20)';
  cx.beginPath();
  cx.moveTo(77, 78);
  cx.lineTo(99, 82);
  cx.lineTo(99, 113);
  cx.lineTo(77, 111);
  cx.closePath();
  cx.fill();
  cx.fillStyle = 'rgb(53,39,25)';
  cx.fillRect(80, 81, 4, 28);
  cx.fillStyle = 'rgb(27,19,13)';
  cx.fillRect(91, 84, 2, 26);
  cx.fillStyle = 'rgb(56,42,28)';
  cx.fillRect(82, 92, 14, 2);
  cx.fillStyle = 'rgb(17,12,9)';
  cx.fillRect(91, 95, 2, 2);
  cx.fillStyle = 'rgba(3,3,3,0.5)';
  cx.fillRect(56, 84, 17, 28);
  cx.fillStyle = 'rgb(44,31,20)';
  cx.fillRect(49, 113, 54, 3);
  cx.fillStyle = 'rgb(23,16,10)';
  cx.fillRect(51, 117, 18, 2);
  cx.fillRect(83, 117, 27, 2);
  cx.fillStyle = 'rgba(6,5,4,0.45)';
  cx.fillRect(49, 112, 62, 4);
  cx.fillStyle = 'rgb(29,20,13)';
  cx.fillRect(46, 115, 31, 3);
  cx.fillStyle = 'rgb(15,11,8)';
  cx.fillRect(82, 116, 36, 2);
  cx.fillStyle = 'rgb(35,25,16)';
  cx.fillRect(32, 116, 12, 2);
  cx.fillRect(119, 114, 10, 2);
  cx.fillStyle = 'rgb(13,10,7)';
  cx.fillRect(61, 121, 36, 2);
  cx.fillStyle = 'rgb(40,28,17)';
  cx.fillRect(67, 119, 16, 1);

  return c;
}

function _near(px, py, x, y, rx, ry) {
  return Math.abs(px - x) <= rx && Math.abs(py - y) <= ry;
}

function _pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w &&
         py >= rect.y && py <= rect.y + rect.h;
}

function _playerCenter() {
  return { x: player.x + 16, y: player.y + 23 };
}

function _playerFoot() {
  return { x: player.x + 16, y: player.y + 29 };
}

function _isNearExteriorDoor() {
  const p = _playerCenter();
  return _near(p.x, p.y, SHACK.doorX, SHACK.doorY, 24, 22);
}

function _isInExteriorDoorway() {
  const p = _playerFoot();
  return _pointInRect(p.x, p.y, {
    x: SHACK.doorX - 18,
    y: SHACK.doorY - 1,
    w: 36,
    h: 17,
  });
}

function isShackExteriorBlocked(x, y) {
  if(SHACK.inside) return false;
  const footX = x + 16;
  const footY = y + 29;
  const walls = [
    { x:SHACK.worldX + 12, y:SHACK.worldY + 23, w:98, h:56 },
    { x:SHACK.worldX - 1, y:SHACK.worldY + 28, w:16, h:53 },
    { x:SHACK.worldX + 108, y:SHACK.worldY + 28, w:16, h:53 },
  ];
  const doorway = { x:SHACK.doorX - 24, y:SHACK.doorY - 2, w:48, h:35 };
  return walls.some(rect => _pointInRect(footX, footY, rect)) &&
         !_pointInRect(footX, footY, doorway);
}

function _isNearInteriorDoor() {
  const p = _playerCenter();
  return _near(p.x, p.y, SHACK.room.x + 132, SHACK.room.y + SHACK.room.h - 4, 28, 26);
}

function _isInInteriorDoorway() {
  const p = _playerFoot();
  return _pointInRect(p.x, p.y, {
    x: SHACK.room.x + 104,
    y: SHACK.room.y + SHACK.room.h - 20,
    w: 58,
    h: 42,
  });
}

function _isNearSwitchblade() {
  const p = _playerCenter();
  return _near(p.x, p.y, SHACK.room.knifeX, SHACK.room.knifeY + 14, 34, 28);
}

function handleShackInteract() {
  if(SHACK.inside) {
    if(!SHACK.tookSwitchblade && _isNearSwitchblade()) {
      SHACK.tookSwitchblade = true;
      addItem('switchblade');
      startDialog('switchblade');
      return true;
    }
    return false;
  }

  return false;
}

function drawShackPrompt(camX, camY) {
  return;
}

function drawShackGround(camX, camY) {
  const startX = 14.45 * TILE;
  const startY = 15.15 * TILE;
  const endX = SHACK.doorX - 2;
  const endY = SHACK.doorY + 16;
  const rocks = ['#2a2118', '#34281d', '#1c1813', '#3b3023', '#241c15', '#463829'];
  const grass = ['rgb(9,14,7)', 'rgb(10,15,8)', 'rgb(11,15,8)'];

  ctx.save();
  ctx.globalAlpha = 0.9;

  for(let i=0; i<86; i++) {
    const t = i / 85;
    const bend = Math.sin(t * Math.PI) * 26;
    const cx = startX + (endX - startX) * t + bend;
    const cy = startY + (endY - startY) * t + Math.sin(t * Math.PI * 2) * 4;
    const half = 22 - Math.abs(t - 0.5) * 9;
    const h = th(i + 15, 43, 7);
    const side = (h % 100) / 100 * 2 - 1;
    const px = cx + side * half + (th(i, 9, 11) % 5 - 2);
    const py = cy + (th(i, 11, 13) % 7 - 3);

    if(h < 70) {
      ctx.fillStyle = rocks[h % rocks.length];
      ctx.fillRect((px - camX)|0, (py - camY)|0, 2 + h % 5, 1 + (h >> 3) % 3);
    } else {
      ctx.fillStyle = grass[h % grass.length];
      ctx.fillRect((px - camX)|0, (py - camY)|0, 1 + h % 3, 2);
    }
  }

  ctx.globalAlpha = 0.55;
  for(let i=0; i<38; i++) {
    const t = i / 37;
    const cx = startX + (endX - startX) * t + Math.sin(t * Math.PI) * 16;
    const cy = startY + (endY - startY) * t;
    const h = th(i, 67, 19);
    ctx.fillStyle = rocks[(h + 2) % rocks.length];
    ctx.fillRect((cx - 9 + h % 19 - camX)|0, (cy - 2 + h % 5 - camY)|0, 3 + h % 4, 1);
  }

  ctx.globalAlpha = 0.38;
  for(let i=0; i<28; i++) {
    const t = i / 27;
    const cx = startX + (endX - startX) * t + Math.sin(t * Math.PI) * 21;
    const cy = startY + (endY - startY) * t + Math.sin(t * Math.PI * 2) * 3;
    const h = th(i, 91, 23);
    ctx.fillStyle = h < 55 ? '#211812' : '#302318';
    ctx.fillRect((cx - 12 + h % 25 - camX)|0, (cy - 4 + h % 9 - camY)|0, 5 + h % 8, 2);
  }

  ctx.restore();
}

function _drawPrompt(x, y, text) {
  ctx.save();
  ctx.font = '7px Courier New';
  ctx.textAlign = 'center';
  const w = Math.max(24, text.length * 6 + 10);
  const xx = Math.round(x - w / 2);
  const yy = Math.round(y);
  ctx.fillStyle = 'rgba(5,4,3,0.78)';
  ctx.fillRect(xx, yy, w, 11);
  ctx.strokeStyle = 'rgba(77,58,36,0.82)';
  ctx.strokeRect(xx + 0.5, yy + 0.5, w - 1, 10);
  ctx.fillStyle = 'rgba(174,139,91,0.9)';
  ctx.fillText(text, Math.round(x), yy + 8);
  ctx.restore();
}

function enterShack() {
  SHACK.transitionCooldown = 18;
  SHACK.transitionFade = 1;
  SHACK.outsideReturn = {
    x: player.x,
    y: player.y,
    dir: player.dir,
    bodyAngle: player.bodyAngle,
    flashlightAngle: flashlight.angle,
    flashlightTarget: flashlight.targetAngle,
  };

  SHACK.inside = true;
  player.x = SHACK.room.x + 120;
  player.y = SHACK.room.y + SHACK.room.h - 58;
  player.vx = 0;
  player.vy = 0;
  player.dir = 0;
  player.bodyAngle = -Math.PI / 2;
  player.tx = Math.floor(player.x / TILE);
  player.ty = Math.floor(player.y / TILE);
  flashlight.angle = 0;
  flashlight.targetAngle = 0;
}

function leaveShack() {
  const out = {
    x: SHACK.doorX - 16,
    y: SHACK.doorY - 10,
    dir: 4,
    bodyAngle: Math.PI / 2,
    flashlightAngle: Math.PI / 2,
    flashlightTarget: Math.PI / 2,
  };

  SHACK.inside = false;
  SHACK.transitionCooldown = 18;
  SHACK.transitionFade = 1;
  player.x = out.x;
  player.y = out.y;
  player.vx = 0;
  player.vy = 0;
  player.dir = out.dir;
  player.bodyAngle = out.bodyAngle;
  player.tx = Math.floor(player.x / TILE);
  player.ty = Math.floor(player.y / TILE);
  flashlight.angle = out.flashlightAngle;
  flashlight.targetAngle = out.flashlightTarget;
}

function updateShackDoorways() {
  if(!gameStarted || dialogActive) return;
  if(typeof inventoryOpen !== 'undefined' && inventoryOpen) return;
  if(SHACK.transitionFade > 0) SHACK.transitionFade = Math.max(0, SHACK.transitionFade - 0.055);
  if(SHACK.transitionCooldown > 0) {
    SHACK.transitionCooldown--;
    return;
  }

  if(SHACK.inside) {
    if(_isInInteriorDoorway()) leaveShack();
  } else if(_isInExteriorDoorway()) {
    enterShack();
  }
}

function drawShackTransitionFade() {
  if(SHACK.transitionFade <= 0) return;
  ctx.save();
  ctx.globalAlpha = SHACK.transitionFade;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.restore();
}

function canStandInShackInterior(x, y) {
  const r = SHACK.room;
  const footX = x + 16;
  const footY = y + 29;

  const walkZones = [
    { x:r.x + 30, y:r.y + 40, w:r.w - 60, h:r.h - 66 },
    { x:r.x + 96, y:r.y + r.h - 30, w:72, h:58 },
  ];
  const blockers = [
    { x:r.x + 40, y:r.y + 57, w:72, h:28 },
    { x:r.x + 181, y:r.y + 128, w:58, h:34 },
  ];

  const inWalkZone = walkZones.some(rect => _pointInRect(footX, footY, rect));
  const blocked = blockers.some(rect => _pointInRect(footX, footY, rect));
  return inWalkZone && !blocked;
}

function drawShackInterior(frame) {
  const r = SHACK.room;

  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Visible open doorway to the path outside, behind the player near screen-bottom.
  ctx.fillStyle = 'rgb(5,7,4)';
  ctx.fillRect(r.x + 88, r.y + r.h - 2, 84, 72);
  ctx.fillStyle = '#291c14';
  for(let y=r.y + r.h + 2; y<r.y + r.h + 70; y+=3) {
    ctx.fillRect(r.x + 92 + ((y*7)%9), y, 72 - ((y*3)%13), 2);
  }
  ctx.fillStyle = 'rgba(4,4,3,0.58)';
  ctx.fillRect(r.x + 86, r.y + r.h - 2, 88, 9);
  ctx.fillStyle = 'rgb(20,14,9)';
  ctx.fillRect(r.x + 93, r.y + r.h + 10, 26, 3);
  ctx.fillRect(r.x + 138, r.y + r.h + 18, 31, 2);
  ctx.fillStyle = 'rgba(2,2,2,0.45)';
  ctx.fillRect(r.x + 100, r.y + r.h + 1, 60, 6);

  // Floor plane.
  ctx.fillStyle = 'rgb(25,21,16)';
  ctx.beginPath();
  ctx.moveTo(r.x + 22, r.y + 31);
  ctx.lineTo(r.x + r.w - 22, r.y + 31);
  ctx.lineTo(r.x + r.w - 32, r.y + r.h - 25);
  ctx.lineTo(r.x + 32, r.y + r.h - 25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(8,6,4,0.3)';
  ctx.fillRect(r.x + 25, r.y + 34, r.w - 50, 3);
  ctx.fillRect(r.x + 34, r.y + r.h - 32, r.w - 68, 3);

  // Low walls around the floor, seen from slightly above.
  ctx.fillStyle = 'rgb(17,15,12)';
  ctx.fillRect(r.x + 8, r.y + 14, r.w - 16, 18);
  ctx.fillRect(r.x + 8, r.y + r.h - 18, 94, 18);
  ctx.fillRect(r.x + 166, r.y + r.h - 18, 86, 18);
  ctx.fillRect(r.x + 8, r.y + 14, 16, r.h - 30);
  ctx.fillRect(r.x + r.w - 24, r.y + 14, 16, r.h - 30);
  ctx.fillStyle = 'rgb(33,25,17)';
  ctx.fillRect(r.x + 104, r.y + r.h - 18, 60, 5);
  ctx.fillStyle = 'rgb(7,6,5)';
  ctx.fillRect(r.x + 20, r.y + 32, 2, r.h - 50);
  ctx.fillRect(r.x + r.w - 27, r.y + 32, 2, r.h - 50);
  ctx.fillStyle = 'rgb(35,25,16)';
  ctx.fillRect(r.x + 44, r.y + 17, 32, 2);
  ctx.fillRect(r.x + 146, r.y + 18, 48, 2);
  ctx.fillStyle = 'rgb(8,7,5)';
  ctx.fillRect(r.x + 98, r.y + r.h - 18, 5, 18);
  ctx.fillRect(r.x + 164, r.y + r.h - 18, 5, 18);

  for(let y=r.y+38; y<r.y+r.h-24; y+=11) {
    const shade = 25 + ((y + frame) % 7);
    ctx.fillStyle = `rgb(${shade},${Math.max(16, shade-5)},${Math.max(12, shade-10)})`;
    ctx.fillRect(r.x + 26, y, r.w - 52, 6);
    ctx.fillStyle = 'rgb(14,12,9)';
    ctx.fillRect(r.x + 26, y+6, r.w - 52, 1);
    if(y % 22 === 0) {
      ctx.fillStyle = 'rgba(52,38,24,0.65)';
      ctx.fillRect(r.x + 34 + (y % 17), y + 2, 28 + (y % 31), 1);
    }
  }
  for(let i=0; i<24; i++) {
    const x = r.x + 31 + (i * 37) % (r.w - 62);
    const y = r.y + 43 + (i * 29) % (r.h - 82);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(58,42,27,0.72)' : 'rgba(10,8,6,0.42)';
    ctx.fillRect(x, y, 3 + (i % 5), 1);
  }
  ctx.fillStyle = 'rgba(3,2,2,0.24)';
  ctx.fillRect(r.x + 36, r.y + r.h - 48, 82, 5);
  ctx.fillRect(r.x + 177, r.y + 119, 66, 5);

  // Open door slab lying into the room from the near/front wall.
  ctx.fillStyle = 'rgb(8,7,5)';
  ctx.fillRect(r.x + 102, r.y + r.h - 20, 64, 14);
  ctx.fillStyle = 'rgb(43,32,22)';
  ctx.beginPath();
  ctx.moveTo(r.x + 154, r.y + r.h - 17);
  ctx.lineTo(r.x + 199, r.y + r.h - 35);
  ctx.lineTo(r.x + 203, r.y + r.h - 8);
  ctx.lineTo(r.x + 160, r.y + r.h + 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgb(58,42,27)';
  ctx.fillRect(r.x + 161, r.y + r.h - 13, 31, 3);
  ctx.fillStyle = 'rgb(23,17,12)';
  ctx.fillRect(r.x + 194, r.y + r.h - 27, 2, 21);
  ctx.fillStyle = 'rgb(14,11,8)';
  ctx.fillRect(r.x + 184, r.y + r.h - 16, 2, 2);
  ctx.fillStyle = 'rgba(5,4,3,0.42)';
  ctx.fillRect(r.x + 108, r.y + r.h - 14, 55, 4);
  ctx.fillStyle = 'rgb(54,39,24)';
  ctx.fillRect(r.x + 168, r.y + r.h - 25, 18, 1);

  // Window and curtain.
  ctx.fillStyle = 'rgb(10,11,9)';
  ctx.fillRect(r.x + r.w - 82, r.y + 28, 56, 26);
  ctx.fillStyle = 'rgb(31,26,21)';
  ctx.fillRect(r.x + r.w - 79, r.y + 31, 50, 20);
  ctx.fillStyle = 'rgba(5,6,5,0.8)';
  ctx.fillRect(r.x + r.w - 76, r.y + 34, 44, 14);
  ctx.fillStyle = 'rgb(61,46,32)';
  ctx.fillRect(r.x + r.w - 81, r.y + 29, 9, 26);
  ctx.fillStyle = 'rgb(43,34,26)';
  ctx.fillRect(r.x + r.w - 72, r.y + 34, 5, 17);
  ctx.fillStyle = 'rgb(35,28,22)';
  ctx.fillRect(r.x + r.w - 40, r.y + 30, 6, 24);
  ctx.fillStyle = 'rgb(27,22,18)';
  ctx.fillRect(r.x + r.w - 84, r.y + 54, 62, 6);
  ctx.fillStyle = 'rgba(9,7,5,0.55)';
  ctx.fillRect(r.x + r.w - 78, r.y + 58, 49, 3);
  ctx.fillStyle = 'rgba(4,4,3,0.35)';
  ctx.fillRect(r.x + r.w - 81, r.y + 61, 56, 5);

  // Switchblade on the sill.
  if(!SHACK.tookSwitchblade) {
    const kx = r.knifeX;
    const ky = r.knifeY;
    ctx.fillStyle = 'rgba(5,4,3,0.5)';
    ctx.fillRect(kx - 9, ky + 7, 20, 1);
    // handle
    ctx.fillStyle = 'rgb(28,22,18)';
    ctx.fillRect(kx - 8, ky + 3, 10, 3);
    ctx.fillStyle = 'rgb(77,62,46)';
    ctx.fillRect(kx - 7, ky + 2, 8, 1);
    ctx.fillStyle = 'rgb(13,10,8)';
    ctx.fillRect(kx - 2, ky + 4, 4, 1);
    // pivot
    ctx.fillStyle = 'rgb(137,119,88)';
    ctx.fillRect(kx + 1, ky + 2, 2, 2);
    ctx.fillStyle = 'rgb(39,31,24)';
    ctx.fillRect(kx + 2, ky + 3, 1, 1);
    // open blade, angled slightly upward on the sill
    ctx.fillStyle = 'rgb(150,145,126)';
    ctx.fillRect(kx + 3, ky + 1, 9, 1);
    ctx.fillRect(kx + 5, ky, 6, 1);
    ctx.fillStyle = 'rgb(85,82,72)';
    ctx.fillRect(kx + 3, ky + 2, 8, 1);
    ctx.fillStyle = 'rgb(191,184,154)';
    ctx.fillRect(kx + 10, ky, 2, 1);
    ctx.fillStyle = 'rgba(5,4,3,0.45)';
    ctx.fillRect(kx - 8, ky + 6, 18, 1);
  }

  // Table.
  ctx.fillStyle = 'rgb(47,36,26)';
  ctx.fillRect(r.x + 40, r.y + 57, 72, 18);
  ctx.fillStyle = 'rgb(28,22,17)';
  ctx.fillRect(r.x + 43, r.y + 74, 5, 18);
  ctx.fillRect(r.x + 101, r.y + 74, 5, 17);
  ctx.fillStyle = 'rgb(64,47,32)';
  ctx.fillRect(r.x + 43, r.y + 59, 63, 3);
  ctx.fillStyle = 'rgba(8,7,5,0.45)';
  ctx.fillRect(r.x + 48, r.y + 66, 50, 2);
  ctx.fillStyle = 'rgb(25,18,12)';
  ctx.fillRect(r.x + 51, r.y + 62, 11, 1);
  ctx.fillRect(r.x + 78, r.y + 71, 17, 1);
  ctx.fillStyle = 'rgba(5,4,3,0.52)';
  ctx.fillRect(r.x + 44, r.y + 76, 64, 4);
  ctx.fillStyle = 'rgb(33,24,15)';
  ctx.fillRect(r.x + 64, r.y + 60, 2, 14);
  ctx.fillRect(r.x + 91, r.y + 58, 2, 16);

  // Sleeping bag.
  ctx.fillStyle = 'rgb(26,32,28)';
  ctx.fillRect(r.x + 184, r.y + 126, 48, 23);
  ctx.fillStyle = 'rgb(16,20,18)';
  ctx.fillRect(r.x + 188, r.y + 129, 41, 6);
  ctx.fillStyle = 'rgb(39,43,34)';
  ctx.fillRect(r.x + 180, r.y + 140, 57, 13);
  ctx.fillStyle = 'rgb(18,21,18)';
  ctx.fillRect(r.x + 183, r.y + 151, 48, 3);
  ctx.fillStyle = 'rgb(48,49,38)';
  ctx.fillRect(r.x + 194, r.y + 133, 22, 2);
  ctx.fillStyle = 'rgb(12,15,13)';
  ctx.fillRect(r.x + 218, r.y + 145, 12, 2);
  ctx.fillStyle = 'rgba(4,5,4,0.38)';
  ctx.fillRect(r.x + 181, r.y + 154, 55, 4);

  // Empty cans.
  const cans = [
    [r.x + 162, r.y + 141], [r.x + 170, r.y + 155],
    [r.x + 151, r.y + 158], [r.x + 238, r.y + 128],
  ];
  for(let i=0; i<cans.length; i++) {
    const x = cans[i][0], y = cans[i][1];
    ctx.fillStyle = i % 2 ? 'rgb(52,46,38)' : 'rgb(60,56,49)';
    ctx.fillRect(x, y, 6, 4);
    ctx.fillStyle = 'rgb(22,20,17)';
    ctx.fillRect(x+1, y+1, 4, 1);
  }
  ctx.fillStyle = 'rgb(42,30,19)';
  ctx.fillRect(r.x + 143, r.y + 116, 9, 2);
  ctx.fillStyle = 'rgba(8,6,4,0.5)';
  ctx.fillRect(r.x + 142, r.y + 118, 12, 1);
  ctx.fillStyle = 'rgb(20,15,10)';
  ctx.fillRect(r.x + 128, r.y + 73, 12, 2);
  ctx.fillStyle = 'rgba(7,5,3,0.45)';
  ctx.fillRect(r.x + 129, r.y + 75, 16, 1);

  // Heavy wall shade for corners.
  ctx.fillStyle = 'rgba(3,3,3,0.22)';
  ctx.fillRect(r.x + 12, r.y + 18, r.w - 24, 9);
  ctx.fillRect(r.x + 12, r.y + r.h - 22, r.w - 24, 8);
}
