'use strict';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const screen = document.createElement('canvas');
screen.width = 320;
screen.height = 180;
const g = screen.getContext('2d');
ctx.imageSmoothingEnabled = false;
g.imageSmoothingEnabled = false;

const $ = (s) => document.querySelector(s);
const panels = ['menu', 'choice', 'treasure', 'armory', 'scores', 'pause', 'summary'];
const W = 320;
const H = 180;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const storeKey = 'ashvault-save-v1';

const C = {
  ink: '#f8e8c8', dark: '#101018', black: '#080810', red: '#d85050', red2: '#8c3038',
  gold: '#e8b858', cyan: '#58c8d8', blue: '#4868b0', violet: '#8058a8', green: '#58a868',
  orange: '#d87840', wall: '#303040', wall2: '#484858', pale: '#d8c890', white: '#fff8e8'
};

const PALETTES = [
  { floor: '#182030', floor2: '#101620', tile: '#283048', wall: '#303848', edge: '#687088', accent: '#58a8b8' },
  { floor: '#281828', floor2: '#181018', tile: '#402038', wall: '#482838', edge: '#885068', accent: '#d06088' },
  { floor: '#302018', floor2: '#18100c', tile: '#483020', wall: '#503020', edge: '#986038', accent: '#e8a850' }
];

const MODIFIERS = [
  { id: 'none', name: 'QUIET STONE', speed: 1, damage: 1, hp: 1, score: 1 },
  { id: 'blood', name: 'BLOOD MOON', speed: 1.22, damage: 1.18, hp: 1, score: 1.2 },
  { id: 'gold', name: 'GILDED CURSE', speed: 1, damage: 1.06, hp: 1.32, score: 1.55 },
  { id: 'veil', name: 'THE VEIL', speed: 1.08, damage: 1.1, hp: 1.08, score: 1.3 }
];

const WEAPONS = {
  pistol: { name: 'CINDER PISTOL', short: 'PST', cooldown: 0.29, damage: 1, speed: 176, pellets: 1, spread: 0, color: '#f0c858', burn: 0.28 },
  scatter: { name: 'ASH SCATTERGUN', short: 'SG', cooldown: 0.62, damage: 0.58, speed: 145, pellets: 5, spread: 0.17, color: '#e87848', knockback: 7 },
  arc: { name: 'VOLT SCEPTER', short: 'ARC', cooldown: 0.42, damage: 0.78, speed: 158, pellets: 1, spread: 0, color: '#68d8e8', chain: true }
};

const BOUNTIES = [
  { id: 'combo', name: 'CHAIN REAPER', desc: 'Reach a 10-kill combo', target: 10 },
  { id: 'swift', name: 'SWIFT DESCENT', desc: 'Clear a chamber in 18 seconds', target: 1 },
  { id: 'nova', name: 'ASH STORM', desc: 'Use Ash Nova twice', target: 2 },
  { id: 'elite', name: 'CROWN BREAKER', desc: 'Defeat 3 elite enemies', target: 3 }
];

const defaults = {
  embers: 0, best: 0, runs: 0, wins: 0,
  unlocks: { ironHeart: 0, edge: 0, boots: 0 }, scores: [],
  achievements: { firstBlood: false, arsenal: false, revenant: false, warden: false }
};

let meta = loadMeta();
let state = 'menu';
let last = 0;
let keys = {};
let mouse = { x: W / 2, y: H / 2, down: false };
let touch = { left: null, right: null, active: false };
let room;
let player;
let enemies = [];
let bullets = [];
let particles = [];
let drops = [];
let hazards = [];
let floaters = [];
let waves = [];
let bolts = [];
let roomNo = 0;
let score = 0;
let kills = 0;
let elapsed = 0;
let roomStart = 0;
let runEmbers = 0;
let paused = false;
let shake = 0;
let flash = 0;
let combo = 0;
let comboTimer = 0;
let comboMultiplier = 1;
let currentBounty = null;
let bountyProgress = 0;
let bountyComplete = false;
let novaUses = 0;
let eliteKills = 0;
let pendingAfterTreasure = null;
let gamepadDash = false;
let gamepadNova = false;
let gamepadSwap = false;
let gamepadPause = false;
let audioCtx;

function loadMeta() {
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey) || '{}');
    return {
      ...structuredClone(defaults), ...raw,
      unlocks: { ...defaults.unlocks, ...(raw.unlocks || {}) },
      achievements: { ...defaults.achievements, ...(raw.achievements || {}) },
      scores: Array.isArray(raw.scores) ? raw.scores : []
    };
  } catch { return structuredClone(defaults); }
}

function saveMeta() { localStorage.setItem(storeKey, JSON.stringify(meta)); updateMeta(); }
function updateMeta() { $('#metaLine').textContent = `EMBERS ${meta.embers}  ·  BEST ${meta.best.toLocaleString()}  ·  ESCAPES ${meta.wins}`; }
function show(id) { panels.forEach((p) => $('#' + p)?.classList.toggle('visible', p === id)); if (id === 'menu') state = 'menu'; }
function hideAll() { panels.forEach((p) => $('#' + p)?.classList.remove('visible')); }
function toast(text) { const el = $('#toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 1700); }

function resetRun() {
  roomNo = 0; score = 0; kills = 0; elapsed = 0; runEmbers = 0;
  combo = 0; comboTimer = 0; comboMultiplier = 1; novaUses = 0; eliteKills = 0;
  enemies = []; bullets = []; particles = []; drops = []; hazards = []; floaters = []; waves = []; bolts = [];
  currentBounty = pick(BOUNTIES); bountyProgress = 0; bountyComplete = false;
  player = {
    x: W / 2, y: H / 2, r: 4,
    hp: 100 + meta.unlocks.ironHeart * 10, maxHp: 100 + meta.unlocks.ironHeart * 10,
    speed: 59 + meta.unlocks.boots * 3, baseDamage: 18 + meta.unlocks.edge * 2,
    lastShot: 0, dashCd: 1.75, dashAt: -9, dashTime: 0, inv: 0, crit: 0.08,
    pierce: 0, multishot: 0, lifesteal: 0, armor: 0, roomHeal: 0, nova: 0, aim: -Math.PI / 2,
    weapon: 'pistol', fireRateMod: 1, arsenal: { pistol: true, scatter: false, arc: false },
    weaponRanks: { pistol: 1, scatter: 1, arc: 1 }, burnBonus: 0, chainBonus: 0
  };
  nextRoom(); state = 'playing'; hideAll(); toast(`BOUNTY: ${currentBounty.name}`);
}

function chooseModifier() {
  if (roomNo === 1 || roomNo === 5 || roomNo === 10 || Math.random() < 0.42) return MODIFIERS[0];
  return pick(MODIFIERS.slice(1));
}

function nextRoom() {
  roomNo++; bullets = []; drops = []; waves = []; bolts = []; roomStart = elapsed;
  room = generateRoom(); player.x = W / 2; player.y = H - 22; spawnWave();
  const label = roomNo === 10 ? 'THE WARDEN AWAKENS' : roomNo === 5 ? 'IRON REVENANT' : `CHAMBER ${roomNo} · ${room.mod.name}`;
  toast(label);
}

function generateRoom() {
  const obs = [];
  const count = roomNo === 5 || roomNo === 10 ? 2 : Math.floor(rand(2, 6));
  for (let i = 0; i < count; i++) {
    const w = Math.floor(rand(18, 40)); const h = Math.floor(rand(13, 28));
    obs.push({ x: Math.floor(rand(22, W - 22 - w)), y: Math.floor(rand(30, H - 42 - h)), w, h });
  }
  const mod = chooseModifier();
  const runes = Array.from({ length: 5 }, () => ({ x: Math.floor(rand(25, W - 25)), y: Math.floor(rand(25, H - 25)), r: Math.floor(rand(6, 16)), spin: rand(-1, 1) }));
  hazards = [];
  if (roomNo !== 5 && roomNo !== 10) {
    for (let i = 0; i < Math.floor(rand(2, 5)); i++) {
      const p = safePoint(obs, 7); hazards.push({ ...p, r: 5, hp: 34, maxHp: 34, dead: false, pulse: rand(0, TAU) });
    }
  }
  return { obs, runes, cleared: false, theme: roomNo < 4 ? 0 : roomNo < 8 ? 1 : 2, mod };
}

function safePoint(obs, radius) {
  for (let k = 0; k < 50; k++) {
    const p = { x: Math.floor(rand(18, W - 18)), y: Math.floor(rand(22, H - 32)) };
    if (!obs.some((o) => p.x + radius > o.x && p.x - radius < o.x + o.w && p.y + radius > o.y && p.y - radius < o.y + o.h)) return p;
  }
  return { x: 25, y: 25 };
}

function spawnWave() {
  enemies = [];
  if (roomNo === 10) { enemies.push(makeEnemy('warden', W / 2, 36, true)); return; }
  if (roomNo === 5) {
    enemies.push(makeEnemy('revenant', W / 2, 38, true));
    enemies.push(makeEnemy('stalker', 72, 44)); enemies.push(makeEnemy('stalker', W - 72, 44));
    return;
  }
  const n = 3 + Math.floor(roomNo * 1.25);
  for (let i = 0; i < n; i++) {
    const roll = Math.random(); let type = 'stalker';
    if (roomNo >= 5 && roll < 0.11) type = 'gravebinder';
    else if (roomNo >= 3 && roll < 0.25) type = 'charger';
    else if (roll < 0.43) type = 'shooter';
    else if (roll < 0.65) type = 'brute';
    const p = safeSpawn();
    const elite = (roomNo % 3 === 0 && i === 0) || (roomNo >= 6 && Math.random() < 0.09);
    enemies.push(makeEnemy(type, p.x, p.y, elite));
  }
}

function safeSpawn() {
  for (let k = 0; k < 40; k++) {
    const p = { x: Math.floor(rand(18, W - 18)), y: Math.floor(rand(18, H / 2)) };
    if (!collidesObs(p.x, p.y, 8)) return p;
  }
  return { x: 25, y: 25 };
}

function makeEnemy(type, x, y, elite = false) {
  const data = {
    stalker: { r: 4, hp: 34, speed: 24, damage: 12, color: '#d85850', value: 90 },
    brute: { r: 6, hp: 92, speed: 14, damage: 22, color: '#a85848', value: 180 },
    shooter: { r: 5, hp: 42, speed: 17, damage: 9, color: '#c89048', value: 150 },
    charger: { r: 5, hp: 72, speed: 19, damage: 20, color: '#d84878', value: 220 },
    gravebinder: { r: 6, hp: 88, speed: 13, damage: 11, color: '#8058c0', value: 280 },
    revenant: { r: 10, hp: 520, speed: 14, damage: 24, color: '#7888a8', value: 1700 },
    warden: { r: 14, hp: 1100, speed: 13, damage: 25, color: '#d8a040', value: 3200 }
  }[type];
  const scale = room?.mod || MODIFIERS[0]; const eliteScale = elite ? 1.6 : 1; const hp = data.hp * scale.hp * eliteScale;
  return {
    x, y, type, elite, ...data, hp, maxHp: hp,
    speed: data.speed * scale.speed * (elite ? 1.08 : 1),
    damage: data.damage * scale.damage * (elite ? 1.2 : 1),
    value: Math.round(data.value * scale.score * (elite ? 2.1 : 1)),
    shield: elite && type !== 'revenant' && type !== 'warden' ? hp * 0.32 : 0,
    maxShield: elite && type !== 'revenant' && type !== 'warden' ? hp * 0.32 : 0,
    hit: 0, attack: rand(0, 0.8), phase: rand(0, TAU), summon: rand(3.5, 5.5),
    telegraph: 0, charge: 0, cvx: 0, cvy: 0, slam: 0, burn: 0, burnTick: 0, deadAwarded: false
  };
}

function collidesObs(x, y, r) { return room?.obs.some((o) => x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h); }
function moveEntity(e, dx, dy) {
  e.x += dx; if (collidesObs(e.x, e.y, e.r) || e.x < e.r || e.x > W - e.r) e.x -= dx;
  e.y += dy; if (collidesObs(e.x, e.y, e.r) || e.y < e.r || e.y > H - e.r) e.y -= dy;
}

function input(dt) {
  let x = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0); let y = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
  let ax = mouse.x - player.x; let ay = mouse.y - player.y; let attack = mouse.down;
  if (touch.left) { x += clamp((touch.left.x - touch.left.startX) / 14, -1, 1); y += clamp((touch.left.y - touch.left.startY) / 14, -1, 1); }
  if (touch.right) { ax = touch.right.x - touch.right.startX; ay = touch.right.y - touch.right.startY; attack = Math.hypot(ax, ay) > 3; }
  const gp = navigator.getGamepads?.()[0];
  if (gp) {
    x += dead(gp.axes[0]); y += dead(gp.axes[1]); const rx = dead(gp.axes[2]); const ry = dead(gp.axes[3]);
    if (Math.hypot(rx, ry) > 0.2) { ax = rx; ay = ry; }
    attack ||= !!gp.buttons[7]?.pressed;
    if (gp.buttons[4]?.pressed && !gamepadDash) dash(x, y);
    if (gp.buttons[3]?.pressed && !gamepadNova) activateNova();
    if (gp.buttons[2]?.pressed && !gamepadSwap) cycleWeapon();
    gamepadDash = !!gp.buttons[4]?.pressed; gamepadNova = !!gp.buttons[3]?.pressed; gamepadSwap = !!gp.buttons[2]?.pressed;
  }
  const length = Math.hypot(x, y) || 1; x /= length; y /= length;
  moveEntity(player, x * player.speed * (player.dashTime > 0 ? 3.6 : 1) * dt, y * player.speed * (player.dashTime > 0 ? 3.6 : 1) * dt);
  if (Math.hypot(ax, ay) > 0.1) player.aim = Math.atan2(ay, ax);
  if (attack) shoot();
  if (keys.Space) { dash(x, y); keys.Space = false; }
  if (keys.KeyQ) { activateNova(); keys.KeyQ = false; }
  if (keys.KeyE) { cycleWeapon(); keys.KeyE = false; }
  if (keys.Digit1) { selectWeapon('pistol'); keys.Digit1 = false; }
  if (keys.Digit2) { selectWeapon('scatter'); keys.Digit2 = false; }
  if (keys.Digit3) { selectWeapon('arc'); keys.Digit3 = false; }
}

const dead = (v) => Math.abs(v) < 0.18 ? 0 : v;
function selectWeapon(id) { if (player?.arsenal[id]) { player.weapon = id; toast(WEAPONS[id].name); sound('swap'); } }
function cycleWeapon() {
  if (!player) return; const owned = Object.keys(WEAPONS).filter((id) => player.arsenal[id]);
  player.weapon = owned[(owned.indexOf(player.weapon) + 1) % owned.length]; toast(WEAPONS[player.weapon].name); sound('swap');
}

function dash(x, y) {
  if (!player || elapsed - player.dashAt < player.dashCd) return;
  player.dashAt = elapsed; player.dashTime = 0.16; player.inv = 0.24; burst(player.x, player.y, C.pale, 12, 70);
  if (!x && !y) moveEntity(player, Math.cos(player.aim) * 14, Math.sin(player.aim) * 14); sound('dash');
}

function activateNova() {
  if (!player || player.nova < 100 || state !== 'playing') return;
  player.nova = 0; novaUses++; updateBounty('nova', novaUses); waves.push({ x: player.x, y: player.y, r: 0, life: 0.6, max: 0.6, color: C.cyan });
  bullets.forEach((b) => { if (b.enemy && Math.hypot(b.x - player.x, b.y - player.y) < 75) b.life = 0; });
  for (const e of enemies) { const d = Math.hypot(e.x - player.x, e.y - player.y); if (d < 65) damageEnemy(e, player.baseDamage * 4.2, true); }
  shake = 5; flash = 0.25; burst(player.x, player.y, C.cyan, 38, 110); sound('nova');
}

function shoot() {
  const w = WEAPONS[player.weapon]; const rank = player.weaponRanks[player.weapon]; const cooldown = w.cooldown * player.fireRateMod * Math.pow(0.94, rank - 1);
  if (elapsed - player.lastShot < cooldown) return; player.lastShot = elapsed;
  const pellets = w.pellets + (player.weapon === 'pistol' ? player.multishot : 0);
  for (let i = 0; i < pellets; i++) {
    const off = (i - (pellets - 1) / 2) * w.spread; const a = player.aim + off + rand(-0.012, 0.012);
    bullets.push({
      x: player.x + Math.cos(a) * 6, y: player.y + Math.sin(a) * 6,
      px: player.x, py: player.y, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed,
      r: player.weapon === 'scatter' ? 1.2 : 1.4,
      damage: player.baseDamage * w.damage * (1 + (rank - 1) * 0.18), pierce: player.pierce,
      enemy: false, life: player.weapon === 'scatter' ? 0.48 : 1.35,
      weapon: player.weapon, color: w.color, burn: w.burn ? w.burn + player.burnBonus : 0, chain: !!w.chain
    });
  }
  burst(player.x + Math.cos(player.aim) * 6, player.y + Math.sin(player.aim) * 6, w.color, 4, 45); sound(player.weapon === 'scatter' ? 'scatter' : player.weapon === 'arc' ? 'arc' : 'shot');
}

function enemyShoot(e, count = 1, speed = null, radial = false) {
  const base = radial ? 0 : Math.atan2(player.y - e.y, player.x - e.x);
  for (let i = 0; i < count; i++) {
    const a = radial ? base + i / count * TAU : base + (i - (count - 1) / 2) * 0.22;
    const velocity = speed || (e.type === 'warden' ? 88 : 69);
    bullets.push({ x: e.x, y: e.y, px: e.x, py: e.y, vx: Math.cos(a) * velocity, vy: Math.sin(a) * velocity, r: e.type === 'warden' ? 2.2 : 1.6, damage: e.damage, enemy: true, life: 4, color: e.type === 'gravebinder' ? '#a878e8' : '#f06050' });
  }
}
