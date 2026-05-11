// ─────────────────────────────────────────
// js/fog.js
// Offscreen canvas mask approach:
// Draw near-black on offscreen canvas,
// erase holes with destination-out,
// then drawImage onto main canvas.
// World shows through the holes at full brightness.
// ─────────────────────────────────────────

function _facingAngle() {
  const a={0:-Math.PI/2,1:-Math.PI/4,2:0,3:Math.PI/4,
           4:Math.PI/2,5:Math.PI*.75,6:Math.PI,7:-Math.PI*.75};
  return a[player.dir]??Math.PI/2;
}

function updateFlashlight() {
  const qH=!!(keys['q']||keys['Q']);
  const eH=!!(keys['e']||keys['E']);
  let offset=0;
  if(qH&&!eH) offset=-0.55;
  else if(eH&&!qH) offset=0.55;
  flashlight.targetAngle=_facingAngle()+offset;
  let diff=flashlight.targetAngle-flashlight.angle;
  while(diff> Math.PI) diff-=Math.PI*2;
  while(diff<-Math.PI) diff+=Math.PI*2;
  flashlight.angle+=diff*0.07;
}

// Persistent offscreen canvas — created once, reused
const FOG_SCALE = 0.5;

let _maskCanvas=null, _maskCtx=null;
function _getMask() {
  if(!_maskCanvas) {
    _maskCanvas=document.createElement('canvas');
    _maskCanvas.width=Math.ceil(CANVAS_W * FOG_SCALE);
    _maskCanvas.height=Math.ceil(CANVAS_H * FOG_SCALE);
    _maskCtx=_maskCanvas.getContext('2d');
    _maskCtx.imageSmoothingEnabled = false;
  }
  return [_maskCanvas, _maskCtx];
}

function drawFog(camX, camY) {
  if(typeof openingIntroActive === 'undefined' || !openingIntroActive) updateFlashlight();
  const px=(player.x-camX+TILE/2) * FOG_SCALE;
  const py=(player.y-camY+TILE/2) * FOG_SCALE;
  const insideShack = typeof isInShackInterior === 'function' && isInShackInterior();
  const ax=flashlight.angle;
  const coneLen=(insideShack ? 245 : 190) * FOG_SCALE;
  const half=insideShack ? 0.58 : 0.34;
  const ambientRadius=(insideShack ? 76 : 46) * FOG_SCALE;

  const [mc, mx] = _getMask();

  // Clear mask and fill near-black
  mx.clearRect(0,0,mc.width,mc.height);
  mx.globalCompositeOperation='source-over';
  mx.fillStyle=insideShack ? 'rgba(0,0,0,0.84)' : 'rgba(0,0,0,0.92)';
  mx.fillRect(0,0,mc.width,mc.height);

  // Cut out holes — erases black, leaving transparent
  mx.globalCompositeOperation='destination-out';

  // Ambient around player
  const amb=mx.createRadialGradient(px,py,0,px,py,ambientRadius);
  amb.addColorStop(0,  'rgba(0,0,0,0.9)');
  amb.addColorStop(0.5,'rgba(0,0,0,0.55)');
  amb.addColorStop(1,  'rgba(0,0,0,0)');
  mx.fillStyle=amb;
  mx.beginPath(); mx.arc(px,py,ambientRadius,0,Math.PI*2); mx.fill();

  // Cone
  const cone=mx.createRadialGradient(px,py,4,px,py,coneLen);
  cone.addColorStop(0,   'rgba(0,0,0,1)');
  cone.addColorStop(0.5, 'rgba(0,0,0,1)');
  cone.addColorStop(0.82,'rgba(0,0,0,0.6)');
  cone.addColorStop(1,   'rgba(0,0,0,0)');
  mx.fillStyle=cone;
  mx.beginPath(); mx.moveTo(px,py);
  mx.arc(px,py,coneLen,ax-half,ax+half);
  mx.closePath(); mx.fill();

  // Soft spill
  const spill=mx.createRadialGradient(px,py,8,px,py,coneLen*0.5);
  spill.addColorStop(0,'rgba(0,0,0,0.22)');
  spill.addColorStop(1,'rgba(0,0,0,0)');
  mx.fillStyle=spill;
  mx.beginPath(); mx.moveTo(px,py);
  mx.arc(px,py,coneLen*0.5,ax-half*1.55,ax+half*1.55);
  mx.closePath(); mx.fill();

  // Composite onto main canvas
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(mc,0,0,CANVAS_W,CANVAS_H);
  ctx.restore();

  _drawIndicator();
}

function _drawIndicator() {
  const qH=!!(keys['q']||keys['Q']);
  const eH=!!(keys['e']||keys['E']);
  const cx=CANVAS_W/2, y=CANVAS_H-16;
  [[cx-14,qH],[cx,!qH&&!eH],[cx+14,eH]].forEach(([dx,on])=>{
    ctx.fillStyle=on?'rgba(210,175,80,0.85)':'rgba(55,45,22,0.45)';
    ctx.beginPath();ctx.arc(dx,y,on?3.5:2,0,Math.PI*2);ctx.fill();
  });
  ctx.fillStyle='rgba(90,72,36,0.4)';
  ctx.font='8px Courier New';ctx.textAlign='center';
  ctx.fillText('hold Q · flashlight · hold E',cx,y+12);
  ctx.textAlign='left';
}
