// ---------------------------------------------------------------------------
// js/weather.js
// Lightweight rain system: wet ground, falling streaks, and small impact hints.
// ---------------------------------------------------------------------------

const RAIN = {
  count: 240,
  speed: 6.4,
  slant: -1.7,
  wind: 0,
  drops: [],
  groundCanvas: null,
  groundCtx: null,
};

function initRain() {
  if(RAIN.drops.length) return;

  for(let i=0; i<RAIN.count; i++) {
    const seed = i * 97 + 13;
    RAIN.drops.push({
      x: (seed * 37) % (CANVAS_W + 80) - 40,
      y: (seed * 53) % (CANVAS_H + 90) - 70,
      len: 3 + (seed % 5),
      speed: RAIN.speed + (seed % 5) * 0.34,
      slant: RAIN.slant + ((seed % 9) - 4) * 0.13,
      alpha: 0.09 + (seed % 7) * 0.012,
      phase: seed % 120,
    });
  }
}

function _rainHash(x, y, n) {
  return ((x*374761393 + y*668265263 + n*2246822519) >>> 0) % 100;
}

function _rainIsPathTile(t) {
  return t===T.PATH || t===T.PATH_EDGE ||
         t===T.EDGE_L || t===T.EDGE_R || t===T.EDGE_TL || t===T.EDGE_TR;
}

function _rainLightBoost(x, y) {
  const px = player.x - cam.x + TILE/2;
  const py = player.y - cam.y + TILE/2;
  const dx = x - px;
  const dy = y - py;
  const distSq = dx*dx + dy*dy;
  if(distSq > 210*210) return 0;

  const invDist = 1 / Math.max(1, Math.sqrt(distSq));
  const fx = Math.cos(flashlight.angle);
  const fy = Math.sin(flashlight.angle);
  const forward = (dx*fx + dy*fy) * invDist;
  if(forward < 0.88) return 0;

  return (forward - 0.88) * 8.33 * (1 - distSq / (210*210));
}

function _initRainGround() {
  if(RAIN.groundCanvas) return;

  RAIN.groundCanvas = document.createElement('canvas');
  RAIN.groundCanvas.width = COLS*TILE;
  RAIN.groundCanvas.height = ROWS*TILE;
  RAIN.groundCtx = RAIN.groundCanvas.getContext('2d');
  const gx = RAIN.groundCtx;

  for(let r=0; r<ROWS; r++) {
    for(let c=0; c<COLS; c++) {
      const t = MAP[r][c];
      const isPath = _rainIsPathTile(t);
      const isGrass = t===T.GRASS;
      if(!isPath && !isGrass) continue;

      const x0 = c*TILE;
      const y0 = r*TILE;
      const h = n => _rainHash(c, r, n);

      if(isPath) {
        gx.fillStyle = 'rgba(12, 10, 8, 0.18)';
        gx.fillRect(x0, y0, TILE, TILE);
      } else if(h(1)<34) {
        gx.fillStyle = 'rgba(4, 8, 5, 0.10)';
        gx.fillRect(x0, y0, TILE, TILE);
      }

      const puddleChance = isPath ? 58 : 16;
      if(h(4) < puddleChance) {
        const px = x0 + 5 + h(5)%22;
        const py = y0 + 8 + h(6)%18;
        const w = (isPath ? 7 : 4) + h(7)%8;
        gx.fillStyle = 'rgba(12, 16, 14, 0.24)';
        gx.fillRect(px, py, w, 2);
        if(w > 9) gx.fillRect(px+2, py+2, w-4, 1);
      }
    }
  }
}

function drawRainGround(camX, camY, frame) {
  _initRainGround();
  ctx.drawImage(
    RAIN.groundCanvas,
    camX, camY, CANVAS_W, CANVAS_H,
    0, 0, CANVAS_W, CANVAS_H
  );

  ctx.save();
  ctx.fillStyle = 'rgba(58, 66, 58, 0.18)';
  const shimmerFrame = Math.floor(frame / 12);
  for(let i=0; i<12; i++) {
    const wx = (i*83 + shimmerFrame*19) % (COLS*TILE);
    const wy = (i*47 + shimmerFrame*11) % (ROWS*TILE);
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    if(tx<0 || tx>=COLS || ty<0 || ty>=ROWS || !_rainIsPathTile(MAP[ty][tx])) continue;
    const sx = wx - camX;
    const sy = wy - camY;
    if(sx<-8 || sx>CANVAS_W+8 || sy<-8 || sy>CANVAS_H+8) continue;
    ctx.fillRect(sx, sy, 6 + (i%5), 1);
  }
  ctx.restore();
}

function drawRainAir(camX, camY, frame) {
  initRain();
  RAIN.wind = Math.sin(frame * 0.012) * 0.55 + Math.sin(frame * 0.031) * 0.25;

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(135, 150, 145, 0.13)';
  ctx.beginPath();
  for(let i=0; i<RAIN.drops.length; i++) {
    const d = RAIN.drops[i];
    d.y += d.speed;
    d.x += d.slant * 0.34 + RAIN.wind;

    if(d.y > CANVAS_H + 28) {
      d.y = -20 - ((i * 17 + frame) % 80);
      d.x = ((i * 67 + frame * 3) % (CANVAS_W + 90)) - 45;
    }
    if(d.x < -60) d.x += CANVAS_W + 120;
    if(d.x > CANVAS_W + 60) d.x -= CANVAS_W + 120;

    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.slant + RAIN.wind, d.y + d.len);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(170, 188, 178, 0.18)';
  ctx.beginPath();
  for(let i=0; i<RAIN.drops.length; i+=3) {
    const d = RAIN.drops[i];
    if(_rainLightBoost(d.x, d.y) <= 0.08) continue;
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.slant + RAIN.wind, d.y + d.len);
  }
  ctx.stroke();

  const px = player.x - camX + TILE/2;
  const py = player.y - camY + TILE/2;
  ctx.strokeStyle = 'rgba(180, 195, 185, 0.16)';
  ctx.beginPath();
  for(let i=1; i<RAIN.drops.length; i+=4) {
    const d = RAIN.drops[i];
    const dx = d.x - px;
    const dy = d.y - py;
    if(dx*dx + dy*dy > 72*72) continue;
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.slant + RAIN.wind, d.y + d.len);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRainImpacts(camX, camY, frame) {
  ctx.save();
  ctx.fillStyle = 'rgba(120, 135, 120, 0.22)';
  for(let i=0; i<22; i++) {
    const wx = (i * 71 + frame * 2) % (COLS*TILE);
    const wy = (i * 47 + frame * 5) % (ROWS*TILE);
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    if(tx<0 || tx>=COLS || ty<0 || ty>=ROWS) continue;
    if(!_rainIsPathTile(MAP[ty][tx]) && MAP[ty][tx]!==T.GRASS) continue;

    const sx = wx - camX;
    const sy = wy - camY;
    if(sx<-8 || sx>CANVAS_W+8 || sy<-8 || sy>CANVAS_H+8) continue;

    const boost = _rainLightBoost(sx, sy);
    if(boost < 0.08 && ((frame+i) % 3) !== 0) continue;
    ctx.globalAlpha = 0.18 + boost * 0.35;
    ctx.fillRect(sx-1, sy, 3, 1);
    if(boost > 0.2) ctx.fillRect(sx-2, sy+1, 5, 1);
  }
  ctx.restore();
}
