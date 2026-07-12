'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const phase = (name) => console.log(`[smoke] ${name}`);

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  toggle(name, force) {
    if (force === true) { this.values.add(name); return true; }
    if (force === false) { this.values.delete(name); return false; }
    if (this.values.has(name)) { this.values.delete(name); return false; }
    this.values.add(name); return true;
  }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.classList = new FakeClassList();
    this.style = { setProperty() {} };
    this.dataset = {};
    this.textContent = '';
    this.innerHTML = '';
    this.onclick = null;
    this.width = 0;
    this.height = 0;
  }
  addEventListener() {}
  removeEventListener() {}
  setAttribute() {}
  requestFullscreen() { return Promise.resolve(); }
}

function makeContext2D() {
  return {
    canvas: null,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    imageSmoothingEnabled: false,
    save() {}, restore() {}, translate() {}, scale() {}, rotate() {},
    clearRect() {}, fillRect() {}, strokeRect() {}, drawImage() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, rect() {},
    fill() {}, stroke() {}, fillText() {}, strokeText() {}, clip() {},
    measureText(text) { return { width: String(text).length * 5 }; },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; }
  };
}

function makeCanvas() {
  const canvas = new FakeElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const context = makeContext2D();
  context.canvas = canvas;
  canvas.getContext = () => context;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 720 });
  return canvas;
}

const gameCanvas = makeCanvas();
const elements = new Map();
const ids = [
  'app', 'menu', 'choice', 'treasure', 'armory', 'scores', 'pause', 'summary',
  'toast', 'metaLine', 'startBtn', 'armoryBtn', 'scoresBtn', 'resumeBtn', 'quitBtn',
  'rotatePrompt', 'rotateAnywayBtn'
];
ids.forEach((id) => elements.set(id, new FakeElement(id)));
elements.set('game', gameCanvas);

const document = {
  hidden: false,
  fullscreenElement: null,
  body: new FakeElement('body'),
  documentElement: new FakeElement('html'),
  querySelector(selector) {
    if (!selector.startsWith('#')) return new FakeElement(selector);
    const id = selector.slice(1);
    if (!elements.has(id)) elements.set(id, new FakeElement(id));
    return elements.get(id);
  },
  querySelectorAll() { return []; },
  createElement(tag) { return tag === 'canvas' ? makeCanvas() : new FakeElement(tag); },
  addEventListener() {},
  removeEventListener() {}
};
document.documentElement.style = { setProperty() {} };

const localStore = new Map();
const localStorage = {
  getItem(key) { return localStore.has(key) ? localStore.get(key) : null; },
  setItem(key, value) { localStore.set(key, String(value)); },
  removeItem(key) { localStore.delete(key); }
};

class FakeAudioNode {
  connect() { return this; }
  start() {}
  stop() {}
}

class FakeAudioContext {
  constructor() { this.currentTime = 0; this.destination = {}; }
  createOscillator() {
    const node = new FakeAudioNode();
    node.frequency = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    node.type = 'square';
    return node;
  }
  createGain() {
    const node = new FakeAudioNode();
    node.gain = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    return node;
  }
}

class FakeImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.decoding = '';
    this.width = 256;
    this.height = 640;
    this._src = '';
  }
  set src(value) {
    this._src = value;
    if (typeof this.onload === 'function') this.onload();
  }
  get src() { return this._src; }
}

let seed = 0x6d2b79f5;
const deterministicMath = Object.create(Math);
deterministicMath.random = () => {
  seed |= 0;
  seed = seed + 0x6d2b79f5 | 0;
  let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
  value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
};

const sandbox = {
  console,
  document,
  localStorage,
  structuredClone,
  URL,
  URLSearchParams,
  Image: FakeImage,
  location: { search: '', href: 'https://example.test/', protocol: 'https:' },
  performance,
  Math: deterministicMath,
  Date,
  JSON,
  Promise,
  setTimeout() { return 1; },
  clearTimeout() {},
  requestAnimationFrame() { return 1; },
  cancelAnimationFrame() {},
  addEventListener() {},
  removeEventListener() {},
  matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} }; },
  navigator: {
    maxTouchPoints: 0,
    getGamepads() { return []; },
    vibrate() { return true; },
    serviceWorker: { register() { return Promise.resolve({ scope: './' }); } }
  },
  screen: { orientation: { lock() { return Promise.resolve(); } } },
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext
};
sandbox.window = sandbox;

const context = vm.createContext(sandbox);
const scripts = [
  'game-core.js',
  'game-combat.js',
  'route-system.js',
  'pixel-assets.js',
  'game-render-v4.js',
  'production-mobile.js',
  'release-enhancements.js',
  'authored-player-0.js',
  'authored-player-1.js',
  'authored-player-2.js',
  'authored-stalker-0.js',
  'authored-stalker-1.js',
  'authored-shooter-0.js',
  'authored-shooter-1.js',
  'authored-brute-0.js',
  'authored-brute-1.js',
  'authored-brute-2.js',
  'authored-brute-3.js',
  'authored-world-0.js',
  'authored-assets.js'
];

async function runSmokeTest() {
  phase('loading browser scripts');
  for (const file of scripts) {
    try {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      vm.runInContext(source, context, { filename: file });
      console.log(`[smoke] loaded ${file}`);
    } catch (error) {
      console.error(`[smoke] failed while loading ${file}`);
      throw error;
    }
  }

  phase('waiting for authored art installation');
  await vm.runInContext('AshvaultAuthoredArt.ready', context);

  phase('checking assets and new run');
  vm.runInContext(`
    const assertBuild = (condition, message) => { if (!condition) throw new Error(message); };

    assertBuild(typeof resetRun === 'function', 'resetRun was not loaded');
    assertBuild(typeof draw === 'function', 'draw was not loaded');
    assertBuild(typeof PixelArt === 'object', 'PixelArt library was not loaded');
    assertBuild(typeof AshvaultAuthoredArt === 'object', 'Authored art loader was not exposed');
    assertBuild(AshvaultAuthoredArt.state.loaded === true, 'Authored art did not finish installing');
    assertBuild(document.documentElement.dataset.authoredArt === 'ready', 'Authored art readiness marker is missing');
    assertBuild(PixelArt.sprites.player.walk.right.length === 4, 'Authored player walk animation is incomplete');
    assertBuild(PixelArt.sprites.stalker.attack.down.length === 4, 'Authored Stalker attack animation is incomplete');
    assertBuild(PixelArt.sprites.shooter.shoot.left.length === 4, 'Authored Shooter firing animation is incomplete');
    assertBuild(PixelArt.sprites.brute.attack.up.length === 4, 'Authored Brute attack animation is incomplete');
    assertBuild(PixelArt.tiles.floor[0].width === 16, 'Authored dungeon tiles were not installed');
    assertBuild(PixelArt.spriteFor('player', 'walk', 'right', 0).width > 0, 'Player sprite is missing');
    assertBuild(PixelArt.spriteFor('warden', 'idle', 'down', 0).width >= 30, 'Warden fallback sprite scale regressed');

    resetRun();
    assertBuild(state === 'playing', 'Run did not enter playing state');
    assertBuild(roomNo === 1, 'First chamber was not created');
    assertBuild(player && enemies.length > 0, 'Player or enemy wave was not created');
  `, context);

  phase('checking movement and player attacks');
  vm.runInContext(`
    const startingX = player.x;
    keys.KeyD = true;
    update(0.05);
    keys.KeyD = false;
    assertBuild(player.x > startingX, 'Keyboard movement did not update the player');

    bullets = [];
    player.lastShot = -99;
    mouse.down = true;
    update(0.02);
    mouse.down = false;
    assertBuild(bullets.some((bullet) => !bullet.enemy), 'Player weapon did not create a projectile');

    player.nova = 100;
    activateNova();
    assertBuild(player.nova === 0, 'Nova charge did not reset');
    assertBuild(waves.length > 0, 'Nova did not create a visible wave');
  `, context);

  phase('checking enemy telegraph and projectile');
  vm.runInContext(`
    bullets = [];
    const shooter = makeEnemy('shooter', 45, 40);
    enemies = [shooter];
    shooter.attack = 0;
    update(0.02);
    assertBuild(shooter.shotWindup > 0, 'Shooter attack did not enter wind-up');
    update(0.30);
    assertBuild(bullets.some((bullet) => bullet.enemy), 'Shooter wind-up did not produce a projectile');
  `, context);

  phase('checking authored renderer and pause lifecycle');
  vm.runInContext(`
    draw();
    assertBuild(document.documentElement.dataset.authoredArt === 'ready', 'Authored renderer failed during a live draw');
    togglePause();
    assertBuild(paused === true && state === 'pause', 'Pause state did not activate');
    togglePause();
    assertBuild(paused === false && state === 'playing', 'Pause state did not resume');
  `, context);

  phase('checking mobile manifest');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.orientation, 'landscape');
  assert.equal(manifest.display, 'fullscreen');

  console.log('Ashvault production smoke test passed.');
}

runSmokeTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
