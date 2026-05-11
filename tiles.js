// ─────────────────────────────────────────
// js/tiles.js
// Pre-rendered texture cache — all tiles drawn
// once at startup into offscreen canvases.
// Per-frame rendering is just drawImage calls.
// ─────────────────────────────────────────

// Tile texture cache: key = "type_mc_mr" or "type" for uniform tiles
const _tc = {};
let _depthProps = [];
let _treeAnchorKeys = null;

function th(mc, mr, n) {
  return ((mc*374761393 + mr*1073741789 + n*2654435761) >>> 0) % 100;
}

// Create a TILE x TILE offscreen canvas
function _makeCanvas() {
  const c = document.createElement('canvas');
  c.width = TILE; c.height = TILE;
  return [c, c.getContext('2d')];
}

function _isPathTile(t) {
  return t===T.PATH || t===T.PATH_EDGE ||
         t===T.EDGE_L || t===T.EDGE_R || t===T.EDGE_TL || t===T.EDGE_TR;
}

// ─────────────────────────────────────────
// PRE-RENDER — called once at startup
// Renders all needed textures into cache
// ─────────────────────────────────────────
function prerenderTiles() {
  _tc.pathLayer = _renderPathLayer();

  // Render grass variants for every map tile
  for(let r=0; r<ROWS; r++) {
    for(let c=0; c<COLS; c++) {
      const t = MAP[r][c];
      const key = `g_${c}_${r}`;
      if(!_tc[key]) _tc[key] = _renderGrass(c, r);

      if(t===T.TREE || t===T.DENSE) {
        const fk = `f_${c}_${r}`;
        if(!_tc[fk]) _tc[fk] = _renderForestFill(c, r, t);
      }
      if((t===T.TREE || t===T.DENSE) && _shouldDrawTreeAnchor(c, r, t)) {
        const tk = `t_${c}_${r}`;
        if(!_tc[tk]) _tc[tk] = _renderTree(c, r);
      }
      if(t===T.LOG) {
        const lk = `l_${c}_${r}`;
        if(!_tc[lk]) _tc[lk] = _renderLog(c, r);
      }
      if(t===T.STUMP) {
        const sk = `s_${c}_${r}`;
        if(!_tc[sk]) _tc[sk] = _renderStump(c, r);
      }
    }
  }

  _tc.groundLayer = _renderGroundLayer();
  _buildDepthProps();
}

function _renderGroundLayer() {
  const c = document.createElement('canvas');
  c.width = COLS * TILE;
  c.height = ROWS * TILE;
  const cx = c.getContext('2d');

  for(let r=0; r<ROWS; r++) {
    for(let col=0; col<COLS; col++) {
      const grass = _tc[`g_${col}_${r}`];
      if(grass) cx.drawImage(grass, col*TILE, r*TILE);
    }
  }

  for(let r=0; r<ROWS; r++) {
    for(let col=0; col<COLS; col++) {
      const fill = _tc[`f_${col}_${r}`];
      if(fill) cx.drawImage(fill, col*TILE, r*TILE);
    }
  }

  return c;
}

function _buildDepthProps() {
  _depthProps = [];

  for(let r=0; r<ROWS; r++) {
    for(let c=0; c<COLS; c++) {
      const t = MAP[r][c];
      if(t===T.TREE || t===T.DENSE) {
        if(!_shouldDrawTreeAnchor(c, r, t)) continue;
        const img = _tc[`t_${c}_${r}`];
        if(img) _depthProps.push({
          img,
          x: c*TILE + TILE/2 - img.width/2,
          y: (r+1)*TILE - img.height,
          depthY: (r+1)*TILE,
          depthX: c*TILE,
        });
      } else if(t===T.LOG) {
        const img = _tc[`l_${c}_${r}`];
        if(img) _depthProps.push({
          img,
          x: c*TILE,
          y: r*TILE,
          depthY: (r+1)*TILE,
          depthX: c*TILE,
        });
      } else if(t===T.STUMP) {
        const img = _tc[`s_${c}_${r}`];
        if(img) _depthProps.push({
          img,
          x: c*TILE,
          y: r*TILE,
          depthY: (r+1)*TILE,
          depthX: c*TILE,
        });
      }
    }
  }

  if(typeof buildShackDepthProp === 'function') {
    const shackProp = buildShackDepthProp();
    if(shackProp) _depthProps.push(shackProp);
  }

  _depthProps.sort((a,b) => (a.depthY - b.depthY) || (a.depthX - b.depthX));
}

function _treeAnchorKey(c, r) {
  return `${c}_${r}`;
}

function _hasPathNeighbor(c, r, radius=2) {
  for(let yy=Math.max(0, r-radius); yy<=Math.min(ROWS-1, r+radius); yy++) {
    for(let xx=Math.max(0, c-radius); xx<=Math.min(COLS-1, c+radius); xx++) {
      if(_isPathTile(MAP[yy][xx])) return true;
    }
  }
  return false;
}

function _shouldDrawTreeAnchor(c, r, t) {
  if(!_treeAnchorKeys) _treeAnchorKeys = _planTreeAnchors();
  return _treeAnchorKeys.has(_treeAnchorKey(c, r));
}

function _planTreeAnchors() {
  const anchors = [];
  const keys = new Set();
  const candidates = [];

  for(let r=0; r<ROWS; r++) {
    for(let c=0; c<COLS; c++) {
      const t = MAP[r][c];
      if(t!==T.TREE && t!==T.DENSE) continue;
      if(typeof isShackBlockingTree === 'function' && isShackBlockingTree(c, r)) continue;

      const nearPath = _hasPathNeighbor(c, r, 2);
      const edge = r===0 || r===ROWS-1 || c===0 || c===COLS-1;
      const dense = t===T.DENSE;
      const priority = (nearPath ? 1000 : 0) + (dense ? 600 : 0) + (edge ? 120 : 0) + th(c, r, 227);

      if(!nearPath && !dense && !edge && th(c, r, 229)<16) continue;
      candidates.push({ c, r, t, nearPath, dense, edge, priority });
    }
  }

  candidates.sort((a,b) => (b.priority - a.priority) || (a.r - b.r) || (a.c - b.c));

  for(const cand of candidates) {
    const x = cand.c*TILE + TILE/2;
    const y = (cand.r+1)*TILE;
    let tooClose = false;
    for(const a of anchors) {
      const dx = Math.abs(x - a.x);
      const dy = Math.abs(y - a.y);
      const sameColumnStack = dx < 18 && dy < 58;
      const sameRowStack = dy < 18 && dx < 58;
      const directNeighbor = dx < 30 && dy < 30;
      if(sameColumnStack || sameRowStack || directNeighbor) {
        tooClose = true;
        break;
      }
    }
    if(tooClose) continue;

    anchors.push({ x, y });
    keys.add(_treeAnchorKey(cand.c, cand.r));
  }

  return keys;
}

// ─────────────────────────────────────────
// GRASS — varied per tile position
// ─────────────────────────────────────────
function _renderGrass(mc, mr) {
  const [cv, cx] = _makeCanvas();
  const h = n => th(mc,mr,n);
  const reclaimed = mr >= 24 && mc >= 4 && mc <= 10;

  cx.fillStyle = reclaimed            ? (h(101)<50 ? 'rgb(9,14,7)' : 'rgb(10,15,8)') :
                 mr%2===0 && mc%2===0 ? 'rgb(11,15,8)' :
                 mr%3===0             ? 'rgb(10,14,7)' : 'rgb(12,16,9)';
  cx.fillRect(0,0,TILE,TILE);

  for(let i=0;i<(reclaimed ? 18 : 10);i++){
    const bx=h(i*4)%30+1, by=h(i*4+1)%22+6, bh=h(i*4+2)%8+3;
    const v=(reclaimed ? 10 : 12)+h(i*4+3)%8;
    cx.fillStyle=`rgb(${v},${v+5},${v-2})`;
    cx.fillRect(bx,by,1,bh);
    if(h(i+40)<(reclaimed ? 45 : 20)) cx.fillRect(bx+1,by+2,1,bh-2);
  }
  if(h(50)<(reclaimed ? 70 : 45)){
    cx.fillStyle=`rgb(${18+h(51)%6},${14+h(52)%5},${8+h(53)%4})`;
    cx.fillRect(h(54)%24+3,h(55)%24+3,h(56)%8+3,h(57)%4+2);
  }
  if(h(60)<(reclaimed ? 45 : 20)){
    cx.fillStyle=`rgb(9,${15+h(61)%6},7)`;
    cx.fillRect(h(62)%16+6,h(63)%16+6,h(64)%12+5,h(65)%7+4);
  }
  if(h(70)<16){
    cx.fillStyle=`rgb(${20+h(71)%6},${16+h(72)%5},${10+h(73)%4})`;
    cx.fillRect(h(74)%18+5,14,TILE-h(74)%18-5,1);
  }
  // mushroom
  if(h(80)<7){
    cx.fillStyle=`rgb(${25+h(81)%10},${14+h(82)%8},${8+h(83)%6})`;
    cx.fillRect(h(84)%22+4,h(85)%20+6,4,2);
    cx.fillStyle=`rgb(${35+h(86)%12},${18+h(87)%8},${10+h(88)%6})`;
    cx.fillRect(h(84)%22+3,h(85)%20+5,6,1);
  }
  return cv;
}

// ─────────────────────────────────────────
// CONTINUOUS PATH LAYER
// ─────────────────────────────────────────
function _renderForestFill(mc, mr, type) {
  const [cv, cx] = _makeCanvas();
  const h = n => th(mc,mr,n);
  const dense = type === T.DENSE;

  cx.fillStyle = dense ? 'rgb(6,9,5)' : 'rgb(8,11,6)';
  cx.fillRect(0,0,TILE,TILE);

  for(let i=0; i<(dense ? 12 : 8); i++) {
    const x = h(i*5)%TILE;
    const y = 4 + h(i*5+1)%26;
    const w = 4 + h(i*5+2)%11;
    const hh = 3 + h(i*5+3)%7;
    const g = 10 + h(i*5+4)%8;
    cx.fillStyle = `rgb(${Math.max(5,g-5)},${g+2},${Math.max(4,g-6)})`;
    cx.fillRect(x, y, Math.min(w, TILE-x), hh);
  }

  for(let i=0; i<(dense ? 4 : 2); i++) {
    const x = h(80+i*4)%27;
    const y = h(81+i*4)%24;
    const trunk = 12 + h(82+i*4)%10;
    const trunkH = 10 + h(83+i*4)%14;
    cx.fillStyle = `rgb(${trunk+2},${trunk},${Math.max(4,trunk-7)})`;
    cx.fillRect(x, y, 3, trunkH);
    cx.fillStyle = `rgb(${Math.max(4,trunk-5)},${Math.max(4,trunk-6)},${Math.max(3,trunk-10)})`;
    cx.fillRect(x+2, y, 1, trunkH);
  }

  cx.fillStyle = dense ? 'rgba(3,5,3,0.38)' : 'rgba(4,6,4,0.28)';
  cx.fillRect(0, 0, TILE, 4 + h(120)%6);

  return cv;
}

function _pathRows() {
  const rows = [];
  for(let r=0; r<ROWS; r++) {
    const cols = [];
    for(let c=0; c<COLS; c++) {
      if(_isPathTile(MAP[r][c])) cols.push(c);
    }
    if(cols.length===0) continue;

    const min = Math.min(...cols);
    const max = Math.max(...cols);
    const center = ((min + max + 1) / 2) * TILE;
    const width = 104;
    const spawnLane = r >= ROWS - 5;
    rows.push({ x:spawnLane ? 6.5*TILE : center, y:r*TILE + TILE/2, width, spawnLane });
  }
  const last = rows[rows.length-1];
  if(last) {
    const startRow = ROWS - 3;
    rows.push({ x:6.5*TILE, y:startRow*TILE + 2, width:last.width, spawnLane:true, fade:0.94, grassFade:1 });
    rows.push({ x:6.5*TILE, y:startRow*TILE + 22, width:last.width, spawnLane:true, fade:0.78, grassFade:1 });
    rows.push({ x:6.5*TILE, y:startRow*TILE + 30, width:last.width, spawnLane:true, fade:0.6, grassFade:0.96 });
    rows.push({ x:6.5*TILE, y:(startRow+1)*TILE + 10, width:last.width, spawnLane:true, fade:0.24, grassFade:0.82 });
  }
  return rows;
}

function _drawSmoothPath(cx, points, widths, extraWidth, color, alpha=1) {
  if(points.length<2) return;
  cx.save();
  cx.globalAlpha = alpha;
  cx.strokeStyle = color;
  cx.lineCap = 'round';
  cx.lineJoin = 'round';

  for(let i=0; i<points.length-1; i++) {
    const p0 = points[Math.max(0, i-1)];
    const p1 = points[i];
    const p2 = points[i+1];
    const p3 = points[Math.min(points.length-1, i+2)];
    const w = ((widths[i] + widths[i+1]) / 2) + extraWidth;
    cx.lineWidth = w;

    cx.beginPath();
    cx.moveTo(p1.x, p1.y);
    for(let step=1; step<=10; step++) {
      const t = step / 10;
      const t2 = t*t;
      const t3 = t2*t;
      const x = 0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
      const y = 0.5 * ((2*p1.y) + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3);
      cx.lineTo(x, y);
    }
    cx.stroke();
  }

  cx.restore();
}

function _makePathMask(points, widths, extraWidth) {
  const c = document.createElement('canvas');
  c.width = COLS * TILE;
  c.height = ROWS * TILE;
  const cx = c.getContext('2d');
  _drawSmoothPath(cx, points, widths, extraWidth, '#fff');
  return c;
}

function _paintPixelDirt(cx, mask, points, rows) {
  const dirt = [
    '#1a120d', '#211711', '#291c14', '#302118',
    '#38261c', '#241912', '#2d1f17', '#20160f',
  ];
  const middle = ['#291c14', '#302118', '#38261c', '#241912'];
  const maskCtx = mask.getContext('2d');
  const maskAlpha = maskCtx.getImageData(0, 0, mask.width, mask.height).data;

  cx.save();
  cx.globalCompositeOperation = 'source-over';
  for(let y=0; y<mask.height; y+=2) {
    for(let x=0; x<mask.width; x+=2) {
      if(maskAlpha[(y * mask.width + x) * 4 + 3]===0) continue;
      const p = _pathPointAt(points, y);
      const row = _pathRowAt(rows, y);
      const centerBias = 1 - Math.min(1, Math.abs(x-p.x) / Math.max(1, row.width/2));
      const h = th(x>>1, y>>1, 17);
      const palette = centerBias>0.68 && h<34 ? middle : dirt;
      cx.fillStyle = palette[h % palette.length];
      const w = h<10 ? 4 : 2;
      const hh = h>86 ? 4 : 2;
      cx.fillRect(x, y, w, hh);
    }
  }
  cx.restore();

  cx.save();
  cx.globalCompositeOperation = 'destination-in';
  cx.drawImage(mask,0,0);
  cx.restore();
}

function _paintPathBlend(cx, points, blendWidths, dirtWidths) {
  const blendRows = points.map((point, i) => ({ x:point.x, y:point.y, width:blendWidths[i] }));
  const dirtRows = points.map((point, i) => ({ x:point.x, y:point.y, width:dirtWidths[i] }));

  for(let y=0; y<ROWS*TILE; y+=2) {
    const p = _pathPointAt(points, y);
    const blend = _pathRowAt(blendRows, y);
    const dirt = _pathRowAt(dirtRows, y);
    const noiseL = Math.sin(y*0.13)*5 + Math.sin(y*0.043)*7 + (th(5, y|0, 9)%9-4);
    const noiseR = Math.sin(y*0.1)*5 + Math.sin(y*0.051)*7 + (th(9, y|0, 13)%9-4);
    const leftOuter = p.x - blend.width/2 + noiseL;
    const leftInner = p.x - dirt.width/2 + noiseL*0.35;
    const rightInner = p.x + dirt.width/2 + noiseR*0.35;
    const rightOuter = p.x + blend.width/2 + noiseR;
    const grassA = th(2, y|0, 41)<50 ? 'rgb(11,15,8)' : 'rgb(10,14,7)';
    const grassB = th(4, y|0, 43)<50 ? 'rgb(11,15,8)' : 'rgb(12,16,9)';
    const muddy = ['#18120c', '#1f150f', '#241912', '#291c14'];

    cx.fillStyle = muddy[th(3, y|0, 20)%muddy.length];
    cx.fillRect(leftOuter, y, Math.max(0, leftInner-leftOuter), 2);
    cx.fillStyle = muddy[th(8, y|0, 21)%muddy.length];
    cx.fillRect(rightInner, y, Math.max(0, rightOuter-rightInner), 2);

    if(th(6, y|0, 29)<72) {
      cx.fillStyle = grassA;
      cx.fillRect(leftOuter - 4, y, Math.max(4, (leftInner-leftOuter)*0.58), 2);
      cx.fillStyle = grassB;
      cx.fillRect(rightOuter - Math.max(4, (rightOuter-rightInner)*0.58) + 4, y, Math.max(4, (rightOuter-rightInner)*0.58), 2);
    }
  }
}

function _paintGrassChunk(cx, x, y, w, h) {
  for(let px=x; px<x+w; px+=4) {
    const ww = Math.min(4, x+w-px);
    cx.fillRect(px, y, ww, h);
  }
}

function _paintRaggedGrassBand(cx, y, start, end, side, grass) {
  const min = Math.floor(Math.min(start, end));
  const max = Math.ceil(Math.max(start, end));
  for(let x=min; x<max; ) {
    const seed = (x>>1) + side * 37;
    const seg = 5 + th(seed, y|0, 51)%18;
    const gap = th(seed, y|0, 53)<22 ? 1 + th(seed, y|0, 55)%4 : 0;
    const jitter = th(seed, y|0, 57)%5 - 2;
    const yy = y + (th(seed, y|0, 63)%3-1);
    const hh = 2 + th(seed, y|0, 65)%3;

    if(th(seed, y|0, 59)<94) {
      cx.fillStyle = grass[th(seed, y|0, 61)%grass.length];
      _paintGrassChunk(cx, x+jitter, yy, seg, hh);
    }

    x += seg + gap;
  }
}

function _paintGrassPatch(cx, x, y, w, h, grass, seed) {
  const rows = Math.max(1, Math.ceil(h / 2));
  for(let r=0; r<rows; r++) {
    const yy = y + r*2 + (th(seed, y+r, 71)%3-1);
    const inset = th(seed+r, y|0, 73)%3;
    const ww = Math.max(3, w - inset - th(seed+r, y|0, 75)%4);
    cx.fillStyle = grass[th(seed+r, y|0, 77)%grass.length];
    _paintGrassChunk(cx, x + inset, yy, ww, 2);
  }
}

function _paintGrassTufts(cx, x, y, side, grass, seed) {
  const count = 4 + th(seed, y|0, 101)%5;
  for(let i=0; i<count; i++) {
    const h = th(seed+i*3, y|0, 103);
    const ox = side * (h%9) + (th(seed+i, y|0, 105)%5-2);
    const oy = th(seed+i, y|0, 107)%9 - 4;
    const bladeH = 3 + th(seed+i, y|0, 109)%6;
    const bladeW = h<45 ? 1 : 2;
    cx.fillStyle = grass[th(seed+i, y|0, 111)%grass.length];
    _paintGrassChunk(cx, x + ox, y + oy, bladeW, bladeH);

    if(h<34) {
      cx.fillStyle = grass[th(seed+i, y|0, 113)%grass.length];
      _paintGrassChunk(cx, x + ox + side*2, y + oy + 1, 2 + h%3, 2);
    }
  }
}

function _paintSidewalkBase(cx, y, start, end, grass, side) {
  const min = Math.floor(Math.min(start, end));
  const max = Math.ceil(Math.max(start, end));
  for(let x=min; x<max; x+=6) {
    const seed = (x>>1) + side*71;
    const w = Math.min(6, max-x);
    const yy = y + (th(seed, y|0, 81)%3-1);
    cx.fillStyle = grass[th(seed, y|0, 83)%5];
    _paintGrassChunk(cx, x, yy, w, 3);
  }
}

function _offsetPathPoints(points, widths, side, offset) {
  return points.map((point, i) => {
    const prev = points[Math.max(0, i-1)];
    const next = points[Math.min(points.length-1, i+1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const d = widths[i]/2 + offset;
    return {
      x: point.x + nx * side * d,
      y: point.y + ny * side * d,
    };
  });
}

function _paintGrassStroke(cx, points, widths, side, offset, strokeWidth, color, alpha=1) {
  const edge = _offsetPathPoints(points, widths, side, offset);
  cx.save();
  cx.globalAlpha = alpha;
  _drawSmoothPath(cx, edge, edge.map(() => strokeWidth), 0, color);
  cx.restore();
}

function _edgePointAt(points, widths, side, offset, y) {
  const edge = _offsetPathPoints(points, widths, side, offset);
  return _pathPointAt(edge, y);
}

function _paintGrassRing(cx, points, widths, grass) {
  const c = document.createElement('canvas');
  c.width = COLS * TILE;
  c.height = ROWS * TILE;
  const rc = c.getContext('2d');
  const outer = _makePathMask(points, widths.map(w => w + 86), 0);
  const inner = _makePathMask(points, widths.map(w => Math.max(8, w - 14)), 0);
  const outerCtx = outer.getContext('2d');
  const innerCtx = inner.getContext('2d');
  const outerAlpha = outerCtx.getImageData(0, 0, outer.width, outer.height).data;
  const innerAlphaData = innerCtx.getImageData(0, 0, inner.width, inner.height).data;

  for(let y=0; y<c.height; y+=1) {
    for(let x=0; x<c.width; x+=1) {
      const alphaIndex = (y * c.width + x) * 4 + 3;
      if(outerAlpha[alphaIndex]===0) continue;
      const innerAlpha = innerAlphaData[alphaIndex];
      if(innerAlpha>0) continue;
      const h = th(x>>1, y>>1, 91);
      rc.fillStyle = grass[h % grass.length];
      const w = h<45 ? 5 : 3;
      const hh = h>65 ? 4 : 3;
      _paintGrassChunk(rc, x, y, w, hh);
    }
  }

  cx.drawImage(c, 0, 0);
}

function _paintSideFill(cx, points, widths, grass, side) {
  const rows = points.map((point, i) => ({ x:point.x, y:point.y, width:widths[i] }));
  for(let y=0; y<ROWS*TILE; y+=2) {
    const p = _pathPointAt(points, y);
    const row = _pathRowAt(rows, y);
    const dirtEdge = p.x + side * row.width/2;
    const near = dirtEdge + side * (1 + th(70, y|0, 57)%3);
    const far = dirtEdge + side * (46 + th(72, y|0, 59)%14);
    const start = Math.min(near, far);
    const end = Math.max(near, far);

    for(let x=start; x<end; x+=2) {
      const h = th(x>>1, y>>1, side>0 ? 97 : 89);
      cx.fillStyle = grass[h % grass.length];
      _paintGrassChunk(cx, x + (h%3-1), y + (h%3-1), h<55 ? 7 : 5, h>72 ? 5 : 4);
    }
  }
}

function _paintGrassOverDirtEdges(cx, points, dirtWidths, blendWidths) {
  const edgeRows = points.map((point, i) => ({ x:point.x, y:point.y, width:dirtWidths[i] }));
  const blendRows = points.map((point, i) => ({ x:point.x, y:point.y, width:blendWidths[i] }));
  const grass = [
    'rgb(8,13,6)', 'rgb(9,14,7)', 'rgb(10,14,7)',
    'rgb(10,15,8)', 'rgb(11,15,8)', 'rgb(12,16,9)',
    'rgb(13,17,9)', 'rgb(15,16,9)'
  ];

  _paintGrassRing(cx, points, dirtWidths, grass);
  _paintSideFill(cx, points, dirtWidths, grass, -1);
  _paintSideFill(cx, points, dirtWidths, grass, 1);
  _paintGrassStroke(cx, points, dirtWidths, 1, -3, 9, 'rgb(10,15,8)', 0.92);
  _paintGrassStroke(cx, points, dirtWidths, -1, -3, 9, 'rgb(10,15,8)', 0.92);

  const startY = Math.max(0, points[0].y|0);
  const endY = Math.min(ROWS*TILE, points[points.length-1].y|0);

  for(let y=startY; y<endY; y+=2) {
    const p = _pathPointAt(points, y);
    const row = _pathRowAt(edgeRows, y);
    const leftAnchor = _edgePointAt(points, dirtWidths, -1, -3, y);
    const rightAnchor = _edgePointAt(points, dirtWidths, 1, -3, y);
    const waveL = Math.sin(y*0.12)*5 + Math.sin(y*0.049)*6 + (th(20, y|0, 27)%7-3);
    const waveR = Math.sin(y*0.1)*5 + Math.sin(y*0.053)*6 + (th(21, y|0, 29)%7-3);
    const leftDirt = p.x - row.width/2 + waveL*0.18;
    const rightDirt = p.x + row.width/2 + waveR*0.18;
    const leftOutline = leftAnchor.x;
    const rightOutline = rightAnchor.x;
    const outsideL = 24 + th(34, y|0, 31)%16;
    const outsideR = 26 + th(36, y|0, 33)%18;
    const spillL = 4 + th(10, y|0, 5)%5;
    const spillR = 4 + th(12, y|0, 7)%5;
    const leftOuter = leftOutline - outsideL;
    const rightOuter = rightOutline + outsideR;
    const leftInner = leftDirt + spillL;
    const rightInner = rightDirt - spillR;

    _paintGrassTufts(cx, leftOutline, y, -1, grass, th(18, y|0, 9));
    _paintGrassTufts(cx, rightOutline, y, 1, grass, th(20, y|0, 10));
    if(th(18, y|0, 9)<45) {
      const patchL = 3 + th(22, y|0, 11)%6;
      const patchR = 3 + th(24, y|0, 13)%6;
      const patchHL = 3 + th(26, y|0, 15)%5;
      const patchHR = 3 + th(28, y|0, 17)%5;
      _paintGrassPatch(cx, leftOutline - th(48, y|0, 39)%7, y - th(49, y|0, 40)%4, patchL, patchHL, grass, th(30, y|0, 19));
      _paintGrassPatch(cx, rightOutline + th(50, y|0, 41)%7 - patchR, y - th(51, y|0, 42)%4, patchR, patchHR, grass, th(32, y|0, 21));
    }

    if(th(38, y|0, 23)<58) {
      const widePush = Math.max(0, row.width - 58) * 0.18;
      const biteL = 3 + th(40, y|0, 25)%5 + widePush;
      const biteR = 3 + th(42, y|0, 27)%5 + widePush;
      _paintGrassPatch(cx, leftOutline + th(52, y|0, 43)%Math.max(1, spillL), y+2 + th(53, y|0, 44)%3, biteL, 3 + th(44, y|0, 29)%4, grass, th(44, y|0, 29));
      _paintGrassPatch(cx, rightOutline - biteR - th(54, y|0, 45)%Math.max(1, spillR), y+2 + th(55, y|0, 46)%3, biteR, 3 + th(46, y|0, 31)%4, grass, th(46, y|0, 31));
    }

    if(th(28, y|0, 17)<26) {
      cx.fillStyle = 'rgb(15,20,10)';
      _paintGrassChunk(cx, leftOuter + th(30, y|0, 19)%Math.max(1, outsideL), y-1, 2, 5);
      _paintGrassChunk(cx, rightOuter - th(32, y|0, 21)%Math.max(1, outsideR), y-1, 2, 5);
    }
  }
}

function _paintSpawnGrassBridge(cx) {
  const grass = ['rgb(8,13,6)', 'rgb(9,14,7)', 'rgb(10,14,7)', 'rgb(10,15,8)', 'rgb(11,15,8)'];
  const centerX = 6.5 * TILE;
  const topY = (ROWS - 4) * TILE + 4;
  const bottomY = (ROWS - 3) * TILE + 10;

  for(let y=topY; y<bottomY; y+=2) {
    const t = (y - topY) / Math.max(1, bottomY - topY);
    const half = 44 - t * 6 + Math.sin(y*0.18)*2;
    const leftEdge = centerX - half;
    const rightEdge = centerX + half;
    const band = 12 + th(11, y|0, 13)%8;

    for(let x=leftEdge-band; x<leftEdge+6; x+=3) {
      const h = th(x>>1, y>>1, 121);
      if(h<18) continue;
      cx.fillStyle = grass[h % grass.length];
      _paintGrassChunk(cx, x + (h%3-1), y + (h%3-1), h<55 ? 4 : 3, h>72 ? 4 : 2);
    }

    for(let x=rightEdge-6; x<rightEdge+band; x+=3) {
      const h = th(x>>1, y>>1, 123);
      if(h<18) continue;
      cx.fillStyle = grass[h % grass.length];
      _paintGrassChunk(cx, x + (h%3-1), y + (h%3-1), h<55 ? 4 : 3, h>72 ? 4 : 2);
    }

    if(th(14, y|0, 17)<70) {
      _paintGrassTufts(cx, leftEdge, y, -1, grass, th(15, y|0, 19));
      _paintGrassTufts(cx, rightEdge, y, 1, grass, th(16, y|0, 21));
    }
  }
}

function _pathPointAt(points, y) {
  if(y <= points[0].y) return points[0];
  for(let i=0; i<points.length-1; i++) {
    const a = points[i], b = points[i+1];
    if(y>=a.y && y<=b.y) {
      const t = (y-a.y) / Math.max(1, b.y-a.y);
      return { x:a.x + (b.x-a.x)*t, y };
    }
  }
  return points[points.length-1];
}

function _pathRowAt(rows, y) {
  return rows.reduce((best, cur) =>
    Math.abs(cur.y-y)<Math.abs(best.y-y) ? cur : best, rows[0]
  );
}

function _renderPathLayer() {
  const c = document.createElement('canvas');
  c.width = COLS * TILE;
  c.height = ROWS * TILE;
  const cx = c.getContext('2d');
  const rows = _pathRows();
  if(rows.length<2) return c;

  const points = rows.map((row, i) => ({
    x: row.x + (row.spawnLane ? 0 : Math.sin(i*1.05) * 11 + Math.sin(i*0.31) * 8),
    y: row.y,
  }));
  const blendWidths = rows.map((row, i) => {
    const fade = row.fade ?? 1;
    return (row.width * 1.02 + Math.sin(i*0.65) * 4) * Math.max(0.32, fade);
  });
  const overlayBlendWidths = rows.map((row, i) => {
    const fade = rows[i].grassFade ?? rows[i].fade ?? 1;
    const taper = rows[i].fade ? Math.max(0.98, fade) : 1;
    return (row.width * 1.02 + Math.sin(i*0.65) * 2) * taper;
  });
  const dirtWidths = blendWidths.map((width, i) => {
    const taperStart = rows.length - 4;
    const taper = rows[i].fade ?? (i >= taperStart ? Math.max(0.68, 1 - (i - taperStart) * 0.14) : 1);
    return (width * 0.64 + Math.sin(i*0.9) * 2) * taper;
  });
  const grassWidths = dirtWidths.map((width, i) => {
    const minWidth = rows[i].fade ? 0.86 : 0.82;
    return Math.max(width, overlayBlendWidths[i] * minWidth);
  });
  const dirtRows = rows.map((row, i) => ({ ...row, width: dirtWidths[i] }));

  _paintPathBlend(cx, points, blendWidths, dirtWidths);

  const pathMask = _makePathMask(points, dirtWidths, 2);
  _drawSmoothPath(cx, points, dirtWidths, 3, 'rgba(5,7,4,0.18)');
  _paintPixelDirt(cx, pathMask, points, dirtRows);

  for(let r=0; r<ROWS; r++) {
    for(let c2=0; c2<COLS; c2++) {
      const h = n => th(c2,r,n);
      const x0 = c2*TILE, y0 = r*TILE;

      for(let i=0; i<5; i++) {
        const px = x0 + h(i*5)%TILE;
        const py = y0 + h(i*5+1)%TILE;
        const p = _pathPointAt(points, py);
        const row = _pathRowAt(dirtRows, py);
        const dist = Math.abs(px - p.x);
        const edge = row.width/2;

        if(dist < edge - 10 && h(i*5+2)<58) {
          const palette = ['#1f150f', '#291c14', '#302118', '#38261c', '#241912'];
          cx.fillStyle = palette[h(i*5+3)%palette.length];
          cx.fillRect(px, py, h(i*5+4)%5+2, 2);
        }
      }

      if(h(70)<16) {
        const px = x0 + h(71)%TILE;
        const py = y0 + h(72)%TILE;
        const p = _pathPointAt(points, py);
        const row = _pathRowAt(dirtRows, py);
        if(Math.abs(px-p.x) < row.width/2 - 8) {
          cx.fillStyle = 'rgba(41,28,20,0.55)';
          cx.fillRect(px, py, h(73)%3+1, h(74)%2+1);
          cx.fillStyle = 'rgba(20,13,9,0.5)';
          cx.fillRect(px+1, py+1, 1, 1);
        }
      }
    }
  }

  _paintGrassOverDirtEdges(cx, points, grassWidths, overlayBlendWidths);
  _paintSpawnGrassBridge(cx);

  return c;
}

// ─────────────────────────────────────────
// TREE — multi-tile sprite so canopy and branches can overhang
// ─────────────────────────────────────────
// Helper: fill an ellipse with fillRect rows (no arc needed)
function _fillOval(cx, x, y, w, h) {
  const rx=w/2, ry=h/2, cx2=x+rx, cy2=y+ry;
  for(let py=0;py<h;py++){
    const dy=(py-ry)/ry;
    const dx=Math.sqrt(Math.max(0,1-dy*dy))*rx;
    const x0=(cx2-dx)|0, x1=(cx2+dx)|0;
    cx.fillRect(x0,y+py,x1-x0,1);
  }
}

function _renderTree(mc, mr) {
  // Render into a multi-tile canvas so tall trunks and branches are not clipped.
  const c = document.createElement('canvas');
  c.width = TILE*3; c.height = TILE*4;
  const cx = c.getContext('2d');
  const h = n => th(mc,mr,n);
  const dense = MAP[mr] && MAP[mr][mc] === T.DENSE;

  const trW    = 6  + h(0)%6 + (dense ? 2 : 0);
  const trH    = 50 + h(1)%22 + (dense ? 8 : 0);
  const trOX   = (h(2)%10-5)|0;
  const trunkC = 18 + h(6)%14;
  const cc     = 9  + h(30)%5;
  const cg     = 13 + h(31)%7;
  // Draw from bottom of canvas (ground)
  const cx2 = (c.width / 2) + trOX;
  const cy2 = c.height;      // ground = bottom of canvas
  const tl  = cx2-(trW/2)|0;
  const tt  = cy2-trH;

  // Trunk
  cx.fillStyle=`rgb(${trunkC+3},${trunkC},${trunkC-6})`;
  cx.fillRect(tl,tt,trW,trH);
  cx.fillStyle=`rgb(${trunkC+10},${trunkC+7},${trunkC+1})`;
  cx.fillRect(tl,tt,2,trH);
  cx.fillStyle=`rgb(${trunkC-6},${trunkC-8},${trunkC-14})`;
  cx.fillRect(tl+trW-2,tt,2,trH);
  for(let i=0;i<6;i++){
    cx.fillStyle=`rgb(${trunkC-3},${trunkC-4},${trunkC-11})`;
    cx.fillRect(tl+2,tt+h(10+i)%trH,trW-3,1);
  }
  // Moss
  if(h(20)<65){
    cx.fillStyle=`rgb(${11+h(21)%5},${17+h(22)%7},${8+h(23)%4})`;
    cx.fillRect(tl,cy2-7,trW,5);
  }

  // Branches
  const brCount = 2 + (dense ? 1 : 0);
  const brStartY = tt + (trH*0.18)|0;
  const brSpan   = (trH*0.46)|0;

  for(let i=0;i<brCount;i++){
    const side  = h(41+i*6)%2===0 ? 1 : -1;
    const slotY = brStartY + ((i + 0.45) * brSpan / brCount);
    const brY   = (slotY + (h(42+i*6)%5-2))|0;
    const brLen = 10 + h(43+i*6)%12 + (dense ? 4 : 0);
    const rise  = h(44+i*6)%10 + 9;

    // Branch line — solid thick
    cx.fillStyle=`rgb(${trunkC-1},${trunkC-3},${trunkC-10})`;
    for(let s=0;s<=brLen;s++){
      cx.fillRect((cx2+side*s)|0,(brY-(s/brLen)*rise)|0,2,2);
    }
    // Fork
    if(h(48+i*6)<60){
      const fS=brLen*0.45|0;
      const fBX=(cx2+side*fS)|0, fBY=(brY-(fS/brLen)*rise)|0;
      const fL=4+h(49+i*6)%6;
      cx.fillStyle=`rgb(${trunkC+1},${trunkC-2},${trunkC-9})`;
      for(let s=0;s<=fL;s++) cx.fillRect((fBX+side*s)|0,(fBY-s*0.65)|0,2,2);
    }

    // Leaf cluster — solid overlapping ovals at branch tip
    const tipX=(cx2+side*brLen)|0, tipY=(brY-rise)|0;
    const clW=17+h(45+i*6)%10 + (dense ? 8 : 0), clH=12+h(46+i*6)%7 + (dense ? 5 : 0);
    // Dark base layer (outer)
    cx.fillStyle=`rgb(${cc-2},${cg},${cc-4})`;
    _fillOval(cx,tipX-clW/2|0,tipY-clH/2|0,clW,clH);
    // Mid layer
    cx.fillStyle=`rgb(${cc+3},${cg+4},${cc})`;
    _fillOval(cx,tipX-clW/3|0,tipY-clH/2|0,clW*0.7|0,clH*0.8|0);
    // Top highlight
    cx.fillStyle=`rgb(${cc+7},${cg+9},${cc+4})`;
    _fillOval(cx,tipX-clW/4|0,tipY-clH*0.7|0,clW*0.4|0,clH*0.35|0);
    // Dark underside
    cx.fillStyle=`rgb(${cc-3},${cg-1},${cc-5})`;
    cx.fillRect(tipX-clW/2|0,tipY+clH/4|0,clW,clH/4|0);

    const mSide = -side;
    const mBrLen = Math.max(8, brLen - (h(60+i*6)%4));
    const mRise = Math.max(8, rise + (h(61+i*6)%5-2));
    const mBrY = brY + (h(62+i*6)%5-2);

    cx.fillStyle=`rgb(${trunkC-1},${trunkC-3},${trunkC-10})`;
    for(let s=0;s<=mBrLen;s++){
      cx.fillRect((cx2+mSide*s)|0,(mBrY-(s/mBrLen)*mRise)|0,2,2);
    }
    if(h(63+i*6)<60){
      const fS=mBrLen*0.45|0;
      const fBX=(cx2+mSide*fS)|0, fBY=(mBrY-(fS/mBrLen)*mRise)|0;
      const fL=4+h(64+i*6)%6;
      cx.fillStyle=`rgb(${trunkC+1},${trunkC-2},${trunkC-9})`;
      for(let s=0;s<=fL;s++) cx.fillRect((fBX+mSide*s)|0,(fBY-s*0.65)|0,2,2);
    }

    const mTipX=(cx2+mSide*mBrLen)|0, mTipY=(mBrY-mRise)|0;
    const mClW=17+h(65+i*6)%10 + (dense ? 8 : 0), mClH=12+h(66+i*6)%7 + (dense ? 5 : 0);
    cx.fillStyle=`rgb(${cc-2},${cg},${cc-4})`;
    _fillOval(cx,mTipX-mClW/2|0,mTipY-mClH/2|0,mClW,mClH);
    cx.fillStyle=`rgb(${cc+3},${cg+4},${cc})`;
    _fillOval(cx,mTipX-mClW/3|0,mTipY-mClH/2|0,mClW*0.7|0,mClH*0.8|0);
    cx.fillStyle=`rgb(${cc+7},${cg+9},${cc+4})`;
    _fillOval(cx,mTipX-mClW/4|0,mTipY-mClH*0.7|0,mClW*0.4|0,mClH*0.35|0);
    cx.fillStyle=`rgb(${cc-3},${cg-1},${cc-5})`;
    cx.fillRect(mTipX-mClW/2|0,mTipY+mClH/4|0,mClW,mClH/4|0);
  }

  // Cover branch roots so limbs emerge from behind the trunk instead of crossing it like rails.
  cx.fillStyle=`rgb(${trunkC+3},${trunkC},${trunkC-6})`;
  cx.fillRect(tl,tt,trW,trH);
  cx.fillStyle=`rgb(${trunkC+10},${trunkC+7},${trunkC+1})`;
  cx.fillRect(tl,tt,2,trH);
  cx.fillStyle=`rgb(${trunkC-6},${trunkC-8},${trunkC-14})`;
  cx.fillRect(tl+trW-2,tt,2,trH);

  // Crown — solid layered oval cluster at top
  const crW=20+h(70)%12 + (dense ? 14 : 0), crH=14+h(71)%8 + (dense ? 8 : 0);
  const crX2=cx2+(h(72)%8-4), crY2=tt-4;
  cx.fillStyle=`rgb(${cc-2},${cg},${cc-4})`;
  _fillOval(cx,crX2-crW/2|0,crY2-crH/2|0,crW,crH);
  cx.fillStyle=`rgb(${cc+3},${cg+4},${cc})`;
  _fillOval(cx,crX2-crW*0.4|0,crY2-crH*0.6|0,crW*0.7|0,crH*0.7|0);
  cx.fillStyle=`rgb(${cc+7},${cg+9},${cc+4})`;
  _fillOval(cx,crX2-crW*0.2|0,crY2-crH*0.7|0,crW*0.35|0,crH*0.3|0);
  // Second smaller cluster offset
  const cr2X=crX2+(h(73)%14-7), cr2Y=crY2+(h(74)%8-4);
  cx.fillStyle=`rgb(${cc-1},${cg+1},${cc-3})`;
  _fillOval(cx,cr2X-crW*0.35|0,cr2Y-crH*0.4|0,crW*0.6|0,crH*0.65|0);
  cx.fillStyle=`rgb(${cc+5},${cg+6},${cc+2})`;
  _fillOval(cx,cr2X-crW*0.15|0,cr2Y-crH*0.55|0,crW*0.28|0,crH*0.25|0);

  if(dense) {
    const lowW = 28 + h(80)%14;
    const lowH = 16 + h(81)%8;
    const lowX = cx2 + (h(82)%16 - 8);
    const lowY = tt + trH * 0.48;
    cx.fillStyle=`rgb(${cc-3},${cg-1},${cc-5})`;
    _fillOval(cx, lowX-lowW/2|0, lowY-lowH/2|0, lowW, lowH);
    cx.fillStyle=`rgb(${cc+2},${cg+3},${cc-1})`;
    _fillOval(cx, lowX-lowW*0.35|0, lowY-lowH*0.55|0, lowW*0.7|0, lowH*0.7|0);
  }

  return c;
}

function _renderLog(mc, mr) {
  const [cv,cx] = _makeCanvas();
  const h = n => th(mc,mr,n);
  const lc=32+h(0)%14;
  cx.fillStyle=`rgb(${lc+4},${lc},${lc-9})`; cx.fillRect(0,8,TILE,14);
  cx.fillStyle=`rgb(${lc+11},${lc+7},${lc-1})`; cx.fillRect(0,8,TILE,3);
  cx.fillStyle=`rgb(${lc-5},${lc-7},${lc-15})`; cx.fillRect(0,20,TILE,2);
  for(let i=0;i<5;i++){
    cx.fillStyle=`rgb(${lc-4},${lc-6},${lc-13})`;
    cx.fillRect(h(i+1)%26+2,10,1,h(i+6)%6+3);
  }
  cx.fillStyle=`rgb(${lc+9},${lc+5},${lc-1})`; cx.fillRect(0,8,7,14);
  cx.fillStyle=`rgb(${lc+2},${lc-2},${lc-10})`; cx.fillRect(1,11,5,7);
  if(h(10)<55){cx.fillStyle='#1a2212'; cx.fillRect(h(11)%18+5,8,h(12)%9+4,2);}
  return cv;
}

function _renderStump(mc, mr) {
  const [cv,cx] = _makeCanvas();
  const h = n => th(mc,mr,n);
  const sc=30+h(0)%13;
  cx.fillStyle=`rgb(${sc},${sc-2},${sc-11})`; cx.fillRect(6,10,20,18);
  cx.fillStyle=`rgb(${sc+9},${sc+5},${sc-1})`; cx.fillRect(6,10,20,5);
  cx.fillStyle=`rgb(${sc-5},${sc-7},${sc-15})`; cx.fillRect(6,24,20,4);
  cx.fillStyle=`rgb(${sc-2},${sc-4},${sc-12})`;
  cx.fillRect(9,13,14,1); cx.fillRect(11,16,10,1);
  if(h(1)<60){cx.fillStyle='#1e2814'; cx.fillRect(6+h(2)%8,10,h(3)%8+4,2);}
  return cv;
}

// ─────────────────────────────────────────
// drawMap — grass tiles plus the continuous path layer
// ─────────────────────────────────────────
function drawMap(camX, camY) {
  if(_tc.groundLayer) {
    ctx.drawImage(
      _tc.groundLayer,
      camX, camY, CANVAS_W, CANVAS_H,
      0, 0, CANVAS_W, CANVAS_H
    );
  }

  if(_tc.pathLayer) {
    ctx.drawImage(
      _tc.pathLayer,
      camX, camY, CANVAS_W, CANVAS_H,
      0, 0, CANVAS_W, CANVAS_H
    );
  }

  // The path layer now owns all path-edge grass. Drawing the older reclaimed
  // tile overlay here makes edits appear misaligned or unchanged.
}

function drawSceneDepth(camX, camY) {
  const viewL = camX - TILE*3;
  const viewT = camY - TILE*4;
  const viewR = camX + CANVAS_W + TILE*3;
  const viewB = camY + CANVAS_H + TILE*4;
  const playerDepthY = player.y + TILE;
  const playerDepthX = player.x;
  let playerDrawn = false;

  for(let i=0; i<_depthProps.length; i++) {
    const o = _depthProps[i];
    if(!playerDrawn && (o.depthY > playerDepthY || (o.depthY === playerDepthY && o.depthX > playerDepthX))) {
      drawPlayer(player.x - camX, player.y - camY);
      playerDrawn = true;
    }

    if(o.x > viewR || o.x + o.img.width < viewL || o.y > viewB || o.y + o.img.height < viewT) continue;
    ctx.drawImage(o.img, o.x - camX, o.y - camY);
  }

  if(!playerDrawn) drawPlayer(player.x - camX, player.y - camY);
}

