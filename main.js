// ─────────────────────────────────────────
// js/main.js
// ─────────────────────────────────────────

let frame       = 0;
let gameStarted = false;
let openingIntroActive = false;
let openingIntroDone = false;
let openingIntroPhase = 'idle';
let openingIntroPhaseFrame = 0;

const openingIntro = {
  x: player.x,
  startY: player.y + 240,
  targetY: player.y - 24,
  speed: 0.42,
};

const titleEl = document.getElementById('title');

function beginGame() {
  if(gameStarted) return;
  gameStarted = true;
  startOpeningIntro();
  titleEl.style.display = 'none';
  startDialog('start');
}

titleEl.onclick = beginGame;

// camera target — float, never rounded
function updateCamera() {
  if(typeof isInShackInterior === 'function' && isInShackInterior()) {
    cam.x = 0;
    cam.y = 0;
    return;
  }

  const targetX = player.x - CANVAS_W/2 + TILE/2;
  const targetY = player.y - CANVAS_H/2 + TILE/2;
  const cx = Math.max(0, Math.min(targetX, COLS*TILE - CANVAS_W));
  const cy = Math.max(0, Math.min(targetY, ROWS*TILE - CANVAS_H));
  cam.x += (cx - cam.x) * CAM_LERP;
  cam.y += (cy - cam.y) * CAM_LERP;
}

function initCamera() {
  cam.x = Math.max(0, Math.min(player.x - CANVAS_W/2 + TILE/2, COLS*TILE - CANVAS_W));
  cam.y = Math.max(0, Math.min(player.y - CANVAS_H/2 + TILE/2, ROWS*TILE - CANVAS_H));
}

function startOpeningIntro() {
  openingIntroActive = true;
  openingIntroDone = false;
  openingIntroPhase = 'walk';
  openingIntroPhaseFrame = 0;
  player.x = openingIntro.x;
  player.y = openingIntro.startY;
  player.vx = 0;
  player.vy = 0;
  player.dir = 0;
  player.bodyAngle = -Math.PI / 2;
}

function updateOpeningIntro() {
  if(!openingIntroActive) return;

  openingIntroPhaseFrame++;
  player.dir = 0;
  player.x += (openingIntro.x - player.x) * 0.12;
  player.running = false;

  if(openingIntroPhase === 'walk') {
    flashlight.targetAngle = -Math.PI / 2;
    player.bodyAngle += _angleDiff(-Math.PI / 2, player.bodyAngle) * 0.24;
    player.y = Math.max(openingIntro.targetY, player.y - openingIntro.speed);
    player.moving = true;
    player.animPhase += 0.075;

    if(player.y <= openingIntro.targetY + 0.01) {
      player.y = openingIntro.targetY;
      player.vx = 0;
      player.vy = 0;
      player.moving = false;
      openingIntroPhase = 'hold';
      openingIntroPhaseFrame = 0;
    }
  } else {
    player.y = openingIntro.targetY;
    player.moving = false;

    if(openingIntroPhase === 'hold') {
      flashlight.targetAngle = -Math.PI / 2;
      if(openingIntroPhaseFrame > 58) {
        openingIntroPhase = 'lookRight';
        openingIntroPhaseFrame = 0;
      }
    } else if(openingIntroPhase === 'lookRight') {
      flashlight.targetAngle = -Math.PI / 2 + 0.58;
      if(openingIntroPhaseFrame > 118) {
        openingIntroPhase = 'lookLeft';
        openingIntroPhaseFrame = 0;
      }
    } else if(openingIntroPhase === 'lookLeft') {
      flashlight.targetAngle = -Math.PI / 2 - 0.58;
      if(openingIntroPhaseFrame > 130 && !dialogActive) {
        flashlight.targetAngle = -Math.PI / 2;
        openingIntroActive = false;
        openingIntroDone = true;
        openingIntroPhase = 'done';
      }
    }
  }

  flashlight.angle += _angleDiff(flashlight.targetAngle, flashlight.angle) * 0.08;
  player.tx = Math.floor(player.x / TILE);
  player.ty = Math.floor(player.y / TILE);
}

function loop() {
  frame++;

  updateOpeningIntro();
  movePlayer();
  if(typeof updateShackDoorways === 'function') updateShackDoorways();
  updateCamera();

  updateWitnesses(frame);
  checkTriggers();

  const interactPressed = isJustPressed(' ') || isJustPressed('Enter');
  if((isJustPressed('i') || isJustPressed('I') || isJustPressed('Tab')) &&
     typeof toggleInventoryScreen === 'function' &&
     gameStarted &&
     !openingIntroActive) {
    toggleInventoryScreen();
  }
  if(typeof inventoryOpen !== 'undefined' && inventoryOpen &&
     (isJustPressed('r') || isJustPressed('R')) &&
     typeof rotateSelectedCaseItem === 'function') {
    rotateSelectedCaseItem();
  }
  if(typeof inventoryOpen !== 'undefined' && inventoryOpen) {
    // case is open; gameplay input is paused
  } else if(interactPressed && !dialogActive && typeof handleShackInteract === 'function') handleShackInteract();
  else if(interactPressed) advanceDialog();
  updateDialog();
  updateRadio();

  // clear
  ctx.fillStyle = C.void;
  ctx.fillRect(0,0,CANVAS_W,CANVAS_H);

  // draw ground — cam values are floats, tiles.js handles sub-pixel via translate
  if(typeof isInShackInterior === 'function' && isInShackInterior()) {
    drawShackInterior(frame);
    drawPlayer(player.x, player.y);
    drawFog(0, 0);
    if(typeof drawShackPrompt === 'function') drawShackPrompt(0, 0);
    if(typeof drawShackTransitionFade === 'function') drawShackTransitionFade();

    clearJustPressed();
    requestAnimationFrame(loop);
    return;
  }

  drawMap(cam.x, cam.y);
  if(typeof drawShackGround === 'function') drawShackGround(cam.x, cam.y);
  drawRainGround(cam.x, cam.y, frame);

  // draw witnesses at float positions
  drawWitnesses(cam.x, cam.y);

  // draw player and tall props in depth order
  drawSceneDepth(cam.x, cam.y);
  drawRainImpacts(cam.x, cam.y, frame);
  drawRainAir(cam.x, cam.y, frame);

  // fog on top
  drawFog(cam.x, cam.y);
  if(typeof drawShackPrompt === 'function') drawShackPrompt(cam.x, cam.y);
  if(typeof drawShackTransitionFade === 'function') drawShackTransitionFade();

  clearJustPressed();
  requestAnimationFrame(loop);
}

prerenderTiles();
initCamera();
loop();
