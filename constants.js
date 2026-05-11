// ─────────────────────────────────────────
// js/constants.js
// ─────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const TILE        = 32;
const COLS        = 26;
const ROWS        = 76;
const CANVAS_W    = 512;
const CANVAS_H    = 342;

const WALK_SPEED  = 0.36;
const RUN_SPEED   = 0.78;
const CAM_LERP    = 0.12;

const flashlight = {
  angle: -Math.PI/2,
  targetAngle: -Math.PI/2,
};

const C = {
  void:       '#050607',
  road:       '#2a2418',
  road2:      '#221e14',
  grass:      '#0e1209',
  grass2:     '#0c1007',
  wall:       '#080b06',
  wall2:      '#0a0e08',
  wallDark:   '#060806',
  roof:       '#0a0d08',
  roofDark:   '#080b06',
  window:     '#060806',
  windowLit:  '#4a4220',
  door:       '#1a1208',
  porch:      '#141008',
  fence:      '#181410',
  path:       '#1e1a12',
  floor:      '#1a1510',
  floor2:     '#141008',
  jackson:    '#c8905a',
  jacksonD:   '#1e1610',
  jacksonC:   '#4a3828',
  jacksonJ:   '#2a3a4a',
  witness:    '#c4c8cc',
  witnessD:   '#888c90',
  witnessF:   '#e0e4e8',
};

const T = {
  VOID:0,
  GRASS:1,       // base forest floor
  PATH:2,        // full dirt path center
  PATH_EDGE:3,   // soft edge — grass growing through path
  TREE:4,        // large tree
  LOG:5,         // fallen log
  STUMP:6,       // stump
  DENSE:7,       // tree wall (same as TREE)
  // Diagonal edge tiles — half path half grass
  EDGE_L:8,      // right edge of path: path bottom-left triangle, grass top-right
  EDGE_R:9,      // left edge of path: path bottom-right triangle, grass top-left
  EDGE_TL:10,    // path narrows going upper-left
  EDGE_TR:11,    // path narrows going upper-right
};

const WALKABLE = new Set([
  T.GRASS, T.PATH, T.PATH_EDGE, T.EDGE_L, T.EDGE_R, T.EDGE_TL, T.EDGE_TR,
]);

const cam = { x: 0, y: 0 };
