(() => {
'use strict';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const lightCanvas = document.createElement('canvas');
lightCanvas.width = canvas.width;
lightCanvas.height = canvas.height;
const lctx = lightCanvas.getContext('2d');
const $ = (s) => document.querySelector(s);
const panels = ['menu', 'choice', 'armory', 'scores', 'pause', 'summary'];
const W = 1280;
const H = 720;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const storeKey = 'ashvault-save-v1';

const defaults = {
  embers: 0,
  best: 0,
  runs: 0,
  wins: 0,
  unlocks: { ironHeart: 0, edge: 0, boots: 0 },
  scores: []
};

const MODIFIERS = [
  { id: 'none', name: 'Quiet Stone', desc: 'No chamber distortion.', speed: 1, damage: 1, hp: 1, score: 1 },
  { id: 'blood', name: 'Blood Moon', desc: 'Enemies move and strike faster.', speed: 1.24, damage: 1.18, hp: 1, score: 1.2 },
  { id: 'gold', name: 'Gilded Curse', desc: 'Hardier enemies yield more score.', speed: 1, damage: 1.05, hp: 1.3, score: 1.55 },
  { id: 'veil', name: 'The Veil', desc: 'Sight is restricted beyond the lantern.', speed: 1.08, damage: 1.08, hp: 1.08, score: 1.3 }
];

const PALETTES = [
  { floor: '#111722', floor2: '#080b12', line: '#293240', accent: '#6fa0b8', wall: '#171d28', edge: '#475263' },
  { floor: '#1a141b', floor2: '#09080d', line: '#392a38', accent: '#a3617b', wall: '#211722', edge: '#594153' },
  { floor: '#211711', floor2: '#0d0907', line: '#493225', accent: '#d09b54', wall: '#261a13', edge: '#67452d' }
];

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
let novaWaves = [];
let roomNo = 0;
let score = 0;
let kills = 0;
let elapsed = 0;
let paused = false;
let shake = 0;
let flash = 0;
let combo = 0;
let comboTimer = 0;
let comboMultiplier = 1;
let gamepadDash = false;
let gamepadNova = false;
let gamepadPause = false;

function loadMeta() {
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey) || '{}');
    return {
      ...structuredClone(defaults),
      ...raw,
      unlocks: { ...defaults.unlocks, ...(raw.unlocks || {}) },
      scores: Array.isArray(raw.scores) ? raw.scores : []
    };
  } catch {
    return structuredClone(defaults);
  }
}

function saveMeta() {
  localStorage.setItem(storeKey, JSON.stringify(meta));
  updateMeta();
}

function updateMeta() {
  $('#metaLine').textContent = `Embers ${meta.embers} · Best ${meta.best.toLocaleString()} · Escapes ${meta.wins}`;
}

function show(id) {
  panels.forEach((p) => $('#' + p).classList.toggle('visible', p === id));
  if (id === 'menu') state = 'menu';
}

function hideAll() {
  panels.forEach((p) => $('#' + p).classList.remove('visible'));
}

function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 1900);
}

function resetRun() {
  roomNo = 0;
  score = 0;
  kills = 0;
  elapsed = 0;
  combo = 0;
  comboTimer = 0;
  comboMultiplier = 1;
  enemies = [];
  bullets = [];
  particles = [];
  drops = [];
  hazards = [];
  floaters = [];
  novaWaves = [];
  player = {
    x: W / 2,
    y: H / 2,
    r: 17,
    hp: 100 + meta.unlocks.ironHeart * 10,
    maxHp: 100 + meta.unlocks.ironHeart * 10,
    speed: 235 + meta.unlocks.boots * 12,
    damage: 18 + meta.unlocks.edge * 2,
    fireRate: 0.32,
    shotSpeed: 680,
    lastShot: 0,
    dashCd: 1.8,
    dashAt: -9,
    dashTime: 0,
    inv: 0,
    crit: 0.08,
    pierce: 0,
    multishot: 1,
    lifesteal: 0,
    armor: 0,
    roomHeal: 0,
    nova: 0,
    aim: -Math.PI / 2,
    weapon: 'Cinder Pistol'
  };
  nextRoom();
  state = 'playing';
  hideAll();
}

function chooseModifier() {
  if (roomNo === 1 || roomNo === 10 || Math.random() < 0.42) return MODIFIERS[0];
  return pick(MODIFIERS.slice(1));
}

function nextRoom() {
  roomNo++;
  bullets = [];
  drops = [];
  novaWaves = [];
  room = generateRoom();
  player.x = W / 2;
  player.y = H - 88;
  spawnWave();
  const label = roomNo === 10 ? 'THE WARDEN AWAKENS' : `CHAMBER ${roomNo} · ${room.mod.name}`;
  toast(label);
}

function generateRoom() {
  const obs = [];
  const count = roomNo === 10 ? 2 : Math.floor(rand(2, 6));
  for (let i = 0; i < count; i++) {
    const w = rand(70, 150);
    const h = rand(55, 115);
    obs.push({ x: rand(90, W - 90 - w), y: rand(120, H - 170 - h), w, h });
  }
  const mod = chooseModifier();
  const runes = Array.from({ length: 5 }, () => ({ x: rand(100, W - 100), y: rand(100, H - 100), r: rand(24, 62), spin: rand(-1, 1) }));
  hazards = [];
  if (roomNo !== 10) {
    const hazardCount = Math.floor(rand(2, 5));
    for (let i = 0; i < hazardCount; i++) {
      const p = safePoint(obs, 26);
      hazards.push({ ...p, r: 18, hp: 34, maxHp: 34, dead: false, pulse: rand(0, TAU) });
    }
  }
  return { obs, runes, cleared: false, theme: roomNo < 4 ? 0 : roomNo < 8 ? 1 : 2, mod, seed: Math.random() * 9999 };
}

function safePoint(obs, radius) {
  for (let k = 0; k < 50; k++) {
    const p = { x: rand(70, W - 70), y: rand(90, H - 130) };
    if (!obs.some((o) => p.x + radius > o.x && p.x - radius < o.x + o.w && p.y + radius > o.y && p.y - radius < o.y + o.h)) return p;
  }
  return { x: 100, y: 100 };
}

function spawnWave() {
  enemies = [];
  if (roomNo === 10) {
    enemies.push(makeEnemy('boss', W / 2, 150, true));
    return;
  }
  const n = 3 + Math.floor(roomNo * 1.25);
  for (let i = 0; i < n; i++) {
    const roll = Math.random();
    let type = 'stalker';
    if (roomNo >= 5 && roll < 0.11) type = 'gravebinder';
    else if (roomNo >= 3 && roll < 0.25) type = 'charger';
    else if (roll < 0.42) type = 'shooter';
    else if (roll < 0.64) type = 'brute';
    const p = safeSpawn();
    const elite = (roomNo % 3 === 0 && i === 0) || (roomNo >= 6 && Math.random() < 0.08);
    enemies.push(makeEnemy(type, p.x, p.y, elite));
  }
}

function safeSpawn() {
  for (let k = 0; k < 40; k++) {
    const p = { x: rand(70, W - 70), y: rand(70, H / 2) };
    if (!collidesObs(p.x, p.y, 32)) return p;
  }
  return { x: 100, y: 100 };
}

function makeEnemy(type, x, y, elite = false) {
  const data = {
    stalker: { r: 15, hp: 34, speed: 95, damage: 12, color: '#d65f59', value: 90 },
    brute: { r: 24, hp: 92, speed: 55, damage: 22, color: '#9f6156', value: 180 },
    shooter: { r: 17, hp: 42, speed: 68, damage: 9, color: '#c09252', value: 150 },
    charger: { r: 20, hp: 72, speed: 74, damage: 20, color: '#d34b76', value: 220 },
    gravebinder: { r: 21, hp: 88, speed: 52, damage: 11, color: '#8068cf', value: 280 },
    boss: { r: 55, hp: 1050, speed: 52, damage: 25, color: '#dfa845', value: 3000 }
  }[type];
  const scale = room?.mod || MODIFIERS[0];
  const eliteScale = elite ? 1.65 : 1;
  const hp = data.hp * scale.hp * eliteScale;
  return {
    x, y, type, elite,
    ...data,
    hp,
    maxHp: hp,
    speed: data.speed * scale.speed * (elite ? 1.08 : 1),
    damage: data.damage * scale.damage * (elite ? 1.2 : 1),
    value: Math.round(data.value * scale.score * (elite ? 2.2 : 1)),
    shield: elite ? hp * 0.34 : 0,
    maxShield: elite ? hp * 0.34 : 0,
    hit: 0,
    attack: rand(0, 0.8),
    phase: rand(0, TAU),
    summon: rand(3.5, 5.5),
    telegraph: 0,
    charge: 0,
    cvx: 0,
    cvy: 0
  };
}

function collidesObs(x, y, r) {
  return room?.obs.some((o) => x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h);
}

function moveEntity(e, dx, dy) {
  e.x += dx;
  if (collidesObs(e.x, e.y, e.r) || e.x < e.r || e.x > W - e.r) e.x -= dx;
  e.y += dy;
  if (collidesObs(e.x, e.y, e.r) || e.y < e.r || e.y > H - e.r) e.y -= dy;
}

function input(dt) {
  let x = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  let y = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
  let ax = mouse.x - player.x;
  let ay = mouse.y - player.y;
  let attack = mouse.down;

  if (touch.left) {
    x += clamp((touch.left.x - touch.left.startX) / 55, -1, 1);
    y += clamp((touch.left.y - touch.left.startY) / 55, -1, 1);
  }
  if (touch.right) {
    ax = touch.right.x - touch.right.startX;
    ay = touch.right.y - touch.right.startY;
    attack = Math.hypot(ax, ay) > 12;
  }

  const gp = navigator.getGamepads?.()[0];
  if (gp) {
    x += dead(gp.axes[0]);
    y += dead(gp.axes[1]);
    const rx = dead(gp.axes[2]);
    const ry = dead(gp.axes[3]);
    if (Math.hypot(rx, ry) > 0.2) { ax = rx; ay = ry; }
    attack = attack || gp.buttons[7]?.pressed;
    if (gp.buttons[4]?.pressed && !gamepadDash) dash(x, y);
    if (gp.buttons[3]?.pressed && !gamepadNova) activateNova();
    gamepadDash = !!gp.buttons[4]?.pressed;
    gamepadNova = !!gp.buttons[3]?.pressed;
  }

  const length = Math.hypot(x, y) || 1;
  x /= length;
  y /= length;
  const speed = player.speed * (player.dashTime > 0 ? 3.6 : 1);
  moveEntity(player, x * speed * dt, y * speed * dt);
  if (Math.hypot(ax, ay) > 0.1) player.aim = Math.atan2(ay, ax);
  if (attack) shoot();
  if (keys.Space) { dash(x, y); keys.Space = false; }
  if (keys.KeyQ) { activateNova(); keys.KeyQ = false; }
}

const dead = (v) => Math.abs(v) < 0.18 ? 0 : v;

function dash(x, y) {
  if (elapsed - player.dashAt < player.dashCd) return;
  player.dashAt = elapsed;
  player.dashTime = 0.16;
  player.inv = 0.24;
  burst(player.x, player.y, '#d9c28a', 22, 280);
  if (!x && !y) moveEntity(player, Math.cos(player.aim) * 55, Math.sin(player.aim) * 55);
  sound('dash');
}

function activateNova() {
  if (!player || player.nova < 100 || state !== 'playing') return;
  player.nova = 0;
  novaWaves.push({ x: player.x, y: player.y, r: 0, life: 0.65, max: 0.65 });
  bullets.forEach((b) => { if (b.enemy && Math.hypot(b.x - player.x, b.y - player.y) < 300) b.life = 0; });
  for (const e of enemies) {
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < 260) {
      const damage = player.damage * 4.2;
      damageEnemy(e, damage, true);
      const push = (260 - d) * 0.35;
      moveEntity(e, (e.x - player.x) / (d || 1) * push, (e.y - player.y) / (d || 1) * push);
    }
  }
  shake = 18;
  flash = 0.35;
  burst(player.x, player.y, '#8de4ff', 70, 430);
  sound('nova');
}

function shoot() {
  if (elapsed - player.lastShot < player.fireRate) return;
  player.lastShot = elapsed;
  const spread = 0.13;
  for (let i = 0; i < player.multishot; i++) {
    const off = (i - (player.multishot - 1) / 2) * spread;
    const a = player.aim + off;
    bullets.push({
      x: player.x + Math.cos(a) * 24,
      y: player.y + Math.sin(a) * 24,
      px: player.x,
      py: player.y,
      vx: Math.cos(a) * player.shotSpeed,
      vy: Math.sin(a) * player.shotSpeed,
      r: 5,
      damage: player.damage,
      pierce: player.pierce,
      enemy: false,
      life: 1.5
    });
  }
  burst(player.x + Math.cos(player.aim) * 25, player.y + Math.sin(player.aim) * 25, '#ffd77a', 6, 180);
  sound('shot');
}

function enemyShoot(e, count = 1, speed = null) {
  const a = Math.atan2(player.y - e.y, player.x - e.x);
  for (let i = 0; i < count; i++) {
    const q = a + (i - (count - 1) / 2) * 0.22;
    const velocity = speed || (e.type === 'boss' ? 340 : 270);
    bullets.push({
      x: e.x,
      y: e.y,
      px: e.x,
      py: e.y,
      vx: Math.cos(q) * velocity,
      vy: Math.sin(q) * velocity,
      r: e.type === 'boss' ? 8 : 6,
      damage: e.damage,
      enemy: true,
      life: 4
    });
  }
}

function update(dt) {
  if (state !== 'playing' || paused) return;
  elapsed += dt;
  player.inv = Math.max(0, player.inv - dt);
  player.dashTime = Math.max(0, player.dashTime - dt);
  comboTimer = Math.max(0, comboTimer - dt);
  if (comboTimer === 0 && combo > 0) {
    combo = 0;
    comboMultiplier = 1;
  }
  input(dt);

  for (const e of enemies) {
    e.hit = Math.max(0, e.hit - dt);
    e.attack -= dt;
    e.summon -= dt;
    e.phase += dt;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;

    if (e.type === 'shooter') {
      if (d > 240) moveEntity(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
      else if (d < 170) moveEntity(e, -dx / d * e.speed * dt, -dy / d * e.speed * dt);
      if (e.attack <= 0) { enemyShoot(e); e.attack = 1.35; }
    } else if (e.type === 'charger') {
      updateCharger(e, dx, dy, d, dt);
    } else if (e.type === 'gravebinder') {
      if (d > 340) moveEntity(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
      else if (d < 235) moveEntity(e, -dx / d * e.speed * dt, -dy / d * e.speed * dt);
      if (e.attack <= 0) { enemyShoot(e, 3, 235); e.attack = 2.1; }
      if (e.summon <= 0) { summonShade(e); e.summon = e.elite ? 3.8 : 5.4; }
    } else if (e.type === 'boss') {
      moveEntity(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
      if (e.attack <= 0) {
        enemyShoot(e, e.hp < e.maxHp * 0.5 ? 9 : 5);
        e.attack = e.hp < e.maxHp * 0.5 ? 0.68 : 1.02;
      }
      if (Math.sin(e.phase * 1.8) > 0.992) spawnMinion(e);
    } else {
      moveEntity(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
    }

    if (d < e.r + player.r + 3 && player.inv <= 0) {
      hurtPlayer(Math.max(1, e.damage - player.armor));
      player.inv = 0.65;
      moveEntity(player, dx / d * 28, dy / d * 28);
    }
  }

  for (const b of bullets) {
    b.px = b.x;
    b.py = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (collidesObs(b.x, b.y, b.r)) b.life = 0;

    if (!b.enemy) {
      for (const h of hazards) {
        if (!h.dead && Math.hypot(b.x - h.x, b.y - h.y) < b.r + h.r) {
          h.hp -= b.damage;
          b.life = 0;
          burst(b.x, b.y, '#f29b55', 5, 120);
          if (h.hp <= 0) explodeHazard(h);
          break;
        }
      }
    }

    if (b.enemy) {
      if (Math.hypot(b.x - player.x, b.y - player.y) < b.r + player.r && player.inv <= 0) {
        hurtPlayer(Math.max(1, b.damage - player.armor));
        player.inv = 0.45;
        b.life = 0;
      }
    } else {
      for (const e of enemies) {
        if (e.hp > 0 && Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
          const crit = Math.random() < player.crit;
          const damage = b.damage * (crit ? 2 : 1);
          damageEnemy(e, damage, crit);
          b.pierce--;
          if (b.pierce < 0) b.life = 0;
          break;
        }
      }
    }
  }

  bullets = bullets.filter((b) => b.life > 0 && b.x > -40 && b.x < W + 40 && b.y > -40 && b.y < H + 40);
  enemies = enemies.filter((e) => e.hp > 0);

  for (const d of drops) {
    if (Math.hypot(d.x - player.x, d.y - player.y) < 35) {
      if (d.type === 'heart') player.hp = Math.min(player.maxHp, player.hp + 18);
      else score += 75;
      d.dead = true;
      toast(d.type === 'heart' ? '+18 vitality' : '+75 score');
      sound('pickup');
    }
  }
  drops = drops.filter((d) => !d.dead);

  hazards.forEach((h) => { h.pulse += dt * 2.4; });
  particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.vx *= 0.96; p.vy *= 0.96; });
  particles = particles.filter((p) => p.life > 0);
  floaters.forEach((f) => { f.y -= 34 * dt; f.life -= dt; });
  floaters = floaters.filter((f) => f.life > 0);
  novaWaves.forEach((n) => { n.r += 520 * dt; n.life -= dt; });
  novaWaves = novaWaves.filter((n) => n.life > 0);
  shake = Math.max(0, shake - dt * 18);
  flash = Math.max(0, flash - dt * 1.8);

  if (!enemies.length && !room.cleared) {
    room.cleared = true;
    player.hp = Math.min(player.maxHp, player.hp + player.roomHeal);
    setTimeout(roomComplete, 650);
  }
}

function updateCharger(e, dx, dy, d, dt) {
  if (e.charge > 0) {
    moveEntity(e, e.cvx * dt, e.cvy * dt);
    e.charge -= dt;
    return;
  }
  if (e.telegraph > 0) {
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      e.cvx = Math.cos(a) * (e.elite ? 720 : 620);
      e.cvy = Math.sin(a) * (e.elite ? 720 : 620);
      e.charge = 0.48;
      burst(e.x, e.y, e.color, 14, 260);
      sound('charge');
    }
    return;
  }
  if (e.attack <= 0 && d < 560) {
    e.telegraph = 0.7;
    e.attack = e.elite ? 1.85 : 2.5;
  } else {
    moveEntity(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
  }
}

function summonShade(e) {
  if (enemies.length >= 14) return;
  for (let i = 0; i < (e.elite ? 2 : 1); i++) {
    const a = rand(0, TAU);
    const shade = makeEnemy('stalker', e.x + Math.cos(a) * 58, e.y + Math.sin(a) * 58, false);
    shade.hp *= 0.72;
    shade.maxHp = shade.hp;
    shade.color = '#7255b8';
    shade.value = 70;
    enemies.push(shade);
  }
  burst(e.x, e.y, '#9c7df0', 26, 220);
  toast('THE GRAVEBINDER CALLS SHADES');
}

function spawnMinion(e) {
  if (enemies.length < 10) {
    const a = rand(0, TAU);
    enemies.push(makeEnemy(Math.random() < 0.4 ? 'charger' : 'stalker', e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80));
  }
}

function damageEnemy(e, amount, crit = false) {
  let remaining = amount;
  if (e.shield > 0) {
    const absorbed = Math.min(e.shield, remaining);
    e.shield -= absorbed;
    remaining -= absorbed;
    burst(e.x, e.y, '#72d6ff', 8, 160);
  }
  if (remaining > 0) e.hp -= remaining;
  e.hit = 0.09;
  score += Math.round(amount * 0.35);
  floaters.push({ x: e.x, y: e.y - e.r, text: `${crit ? '✦ ' : ''}${Math.round(amount)}`, color: crit ? '#fff1a8' : '#f0c07a', life: 0.72, max: 0.72, size: crit ? 22 : 16 });
  burst(e.x, e.y, crit ? '#fff1a8' : '#d36b55', crit ? 12 : 6, crit ? 250 : 150);
  if (e.hp <= 0) killEnemy(e);
}

function explodeHazard(h) {
  if (h.dead) return;
  h.dead = true;
  shake = Math.max(shake, 9);
  burst(h.x, h.y, '#ff9a52', 34, 360);
  for (const e of enemies) {
    const d = Math.hypot(e.x - h.x, e.y - h.y);
    if (d < 125) damageEnemy(e, 58 * (1 - d / 180), false);
  }
  const pd = Math.hypot(player.x - h.x, player.y - h.y);
  if (pd < 90 && player.inv <= 0) hurtPlayer(10);
  if (Math.random() < 0.3) drops.push({ x: h.x, y: h.y, type: Math.random() < 0.45 ? 'heart' : 'coin' });
  sound('explode');
}

function hurtPlayer(amount) {
  player.hp -= amount;
  shake = 12;
  flash = 0.42;
  combo = 0;
  comboTimer = 0;
  comboMultiplier = 1;
  burst(player.x, player.y, '#ff554f', 22, 330);
  floaters.push({ x: player.x, y: player.y - 26, text: `-${Math.round(amount)}`, color: '#ff6b63', life: 0.9, max: 0.9, size: 22 });
  sound('hurt');
  if (player.hp <= 0) endRun(false);
}

function killEnemy(e) {
  if (e.deadAwarded) return;
  e.deadAwarded = true;
  kills++;
  combo++;
  comboTimer = 3.5;
  comboMultiplier = 1 + Math.min(3, Math.floor(combo / 3) * 0.35);
  score += Math.round(e.value * comboMultiplier);
  player.nova = Math.min(100, player.nova + (e.elite ? 32 : e.type === 'boss' ? 100 : 15));
  shake = Math.min(12, shake + (e.elite ? 6 : 2));
  burst(e.x, e.y, e.color, e.elite ? 38 : 20, e.elite ? 390 : 250);
  if (e.elite) toast(`ELITE BROKEN · x${comboMultiplier.toFixed(2)}`);
  if (player.lifesteal) player.hp = Math.min(player.maxHp, player.hp + player.lifesteal);
  if (Math.random() < 0.12) drops.push({ x: e.x, y: e.y, type: 'heart' });
  else if (Math.random() < 0.22 || e.elite) drops.push({ x: e.x, y: e.y, type: 'coin' });
  sound('kill');
}

function roomComplete() {
  if (state !== 'playing') return;
  if (roomNo === 10) { endRun(true); return; }
  const choices = pickUpgrades(3);
  $('#choice').innerHTML = `<p class="eyebrow">CHAMBER CLEARED</p><h2>Choose a Relic</h2><div class="cards">${choices.map((u, i) => `<button class="card" data-up="${i}"><span class="tag">${u.rarity}</span><h3>${u.name}</h3><p>${u.desc}</p></button>`).join('')}</div>`;
  $('#choice').classList.add('visible');
  state = 'choice';
  document.querySelectorAll('[data-up]').forEach((button) => {
    button.onclick = () => {
      choices[+button.dataset.up].apply();
      $('#choice').classList.remove('visible');
      state = 'playing';
      nextRoom();
    };
  });
}

const upgrades = [
  { name: 'Tempered Edge', rarity: 'common', desc: '+25% weapon damage.', apply() { player.damage *= 1.25; } },
  { name: 'Quicklock', rarity: 'common', desc: '20% faster attacks.', apply() { player.fireRate *= 0.8; } },
  { name: 'Longshot Rune', rarity: 'common', desc: '+25% projectile speed and +10% damage.', apply() { player.shotSpeed *= 1.25; player.damage *= 1.1; } },
  { name: 'Blood Chalice', rarity: 'rare', desc: 'Heal 3 vitality on every kill.', apply() { player.lifesteal += 3; } },
  { name: 'Split Sigil', rarity: 'rare', desc: 'Fire one additional projectile.', apply() { player.multishot = Math.min(5, player.multishot + 1); } },
  { name: 'Ghost Nail', rarity: 'rare', desc: 'Projectiles pierce one additional foe.', apply() { player.pierce++; } },
  { name: 'Blackglass Heart', rarity: 'rare', desc: '+35 maximum vitality and heal fully.', apply() { player.maxHp += 35; player.hp = player.maxHp; } },
  { name: 'Warden Plate', rarity: 'rare', desc: 'Reduce all incoming damage by 4.', apply() { player.armor += 4; } },
  { name: 'Execution Mark', rarity: 'legendary', desc: '+15% critical chance.', apply() { player.crit += 0.15; } },
  { name: 'Ashen Renewal', rarity: 'legendary', desc: 'Heal 10 vitality after every chamber.', apply() { player.roomHeal += 10; } },
  { name: 'Nova Conduit', rarity: 'legendary', desc: 'Ash Nova charges 35% faster.', apply() { player.nova = Math.min(100, player.nova + 35); } },
  { name: 'Storm Chamber', rarity: 'legendary', desc: '40% faster attacks, but lose 15 maximum vitality.', apply() { player.fireRate *= 0.6; player.maxHp = Math.max(25, player.maxHp - 15); player.hp = Math.min(player.hp, player.maxHp); } }
];

function pickUpgrades(n) {
  return [...upgrades].sort(() => Math.random() - 0.5).slice(0, n);
}

function endRun(win) {
  if (state === 'summary') return;
  state = 'summary';
  paused = false;
  const earned = Math.floor(roomNo * 3 + kills * 0.5 + (win ? 35 : 0));
  meta.embers += earned;
  meta.runs++;
  if (win) meta.wins++;
  meta.best = Math.max(meta.best, score);
  meta.scores.push({ score, rooms: roomNo, time: Math.floor(elapsed), win, date: new Date().toLocaleDateString() });
  meta.scores.sort((a, b) => b.score - a.score);
  meta.scores = meta.scores.slice(0, 10);
  saveMeta();
  $('#summary').innerHTML = `<p class="eyebrow">${win ? 'VAULT CONQUERED' : 'THE VAULT CLAIMS ANOTHER'}</p><h2>${win ? 'The Warden Falls' : 'Run Ended'}</h2><div class="score-row"><span>Score</span><strong>${score.toLocaleString()}</strong></div><div class="score-row"><span>Chambers</span><strong>${roomNo}/10</strong></div><div class="score-row"><span>Enemies defeated</span><strong>${kills}</strong></div><div class="score-row"><span>Final multiplier</span><strong>x${comboMultiplier.toFixed(2)}</strong></div><div class="score-row"><span>Embers recovered</span><strong>${earned}</strong></div><button id="again">Run Again</button><button id="home" class="secondary">Return to Vault</button>`;
  show('summary');
  $('#again').onclick = resetRun;
  $('#home').onclick = () => { show('menu'); updateMeta(); };
}

function burst(x, y, color, count, maxSpeed = 220) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU);
    const speed = rand(30, maxSpeed);
    particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: rand(0.25, 0.75), max: 0.75, color, r: rand(1, 4), glow: Math.random() < 0.35 });
  }
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  const sx = shake ? rand(-shake, shake) : 0;
  const sy = shake ? rand(-shake, shake) : 0;
  ctx.translate(sx, sy);
  drawFloor();
  if (room) {
    drawShadows();
    room.obs.forEach(drawObs);
    hazards.filter((h) => !h.dead).forEach(drawHazard);
    drops.forEach(drawDrop);
    bullets.forEach(drawBullet);
    enemies.forEach(drawEnemy);
    if (player) drawPlayer();
    particles.forEach(drawParticle);
    novaWaves.forEach(drawNova);
    floaters.forEach(drawFloater);
    drawLighting();
  }
  ctx.restore();
  drawPostProcess();
  if (state === 'playing' || state === 'choice' || paused) drawHud();
  if (touch.active || matchMedia('(pointer: coarse)').matches) drawTouchControls();
}

function drawFloor() {
  const palette = PALETTES[room?.theme || 0];
  const grad = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 780);
  grad.addColorStop(0, palette.floor);
  grad.addColorStop(1, palette.floor2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = palette.line;
  ctx.globalAlpha = 0.32;
  for (let x = -24; x < W + 48; x += 48) {
    for (let y = -24; y < H + 48; y += 48) {
      ctx.strokeRect(x, y, 48, 48);
      if (((x + y) / 48) % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(x, y + 48);
        ctx.lineTo(x + 48, y);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;

  if (room) {
    ctx.save();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    room.runes.forEach((r, i) => {
      ctx.globalAlpha = 0.08 + 0.04 * Math.sin(elapsed * 1.8 + i);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, elapsed * r.spin, elapsed * r.spin + Math.PI * 1.55);
      ctx.stroke();
      ctx.beginPath();
      for (let p = 0; p < 6; p++) {
        const a = p / 6 * TAU + elapsed * r.spin * 0.3;
        const rr = p % 2 ? r.r * 0.45 : r.r * 0.72;
        ctx.lineTo(r.x + Math.cos(a) * rr, r.y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.stroke();
    });
    ctx.restore();
  }
}

function drawShadows() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.42)';
  hazards.filter((h) => !h.dead).forEach((h) => { ctx.beginPath(); ctx.ellipse(h.x + 8, h.y + 12, h.r * 1.1, h.r * 0.55, 0, 0, TAU); ctx.fill(); });
  enemies.forEach((e) => { ctx.beginPath(); ctx.ellipse(e.x + 10, e.y + e.r * 0.62, e.r * 1.05, e.r * 0.5, 0, 0, TAU); ctx.fill(); });
  if (player) { ctx.beginPath(); ctx.ellipse(player.x + 9, player.y + 12, 20, 9, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

function drawObs(o) {
  const palette = PALETTES[room.theme];
  const grad = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
  grad.addColorStop(0, palette.edge);
  grad.addColorStop(0.12, palette.wall);
  grad.addColorStop(1, '#0c0e14');
  ctx.fillStyle = grad;
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.strokeStyle = palette.edge;
  ctx.lineWidth = 3;
  ctx.strokeRect(o.x, o.y, o.w, o.h);
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  ctx.fillRect(o.x + 7, o.y + 7, o.w - 14, 7);
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  for (let y = o.y + 25; y < o.y + o.h; y += 24) {
    ctx.beginPath(); ctx.moveTo(o.x, y); ctx.lineTo(o.x + o.w, y); ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.aim);
  const flicker = player.inv > 0 && Math.floor(elapsed * 20) % 2;
  ctx.shadowBlur = 24;
  ctx.shadowColor = '#e8c980';
  ctx.fillStyle = flicker ? '#fff' : '#d9c28a';
  ctx.beginPath();
  ctx.arc(0, 0, player.r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#3b3540';
  ctx.fillRect(8, -5, 27, 10);
  ctx.fillStyle = '#f3d77f';
  ctx.fillRect(29, -3, 7, 6);
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, player.r - 4, -1.8, 1.8);
  ctx.stroke();
  ctx.restore();
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.type === 'charger' && e.telegraph > 0) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    ctx.save();
    ctx.rotate(a);
    ctx.strokeStyle = `rgba(255,70,100,${0.35 + 0.35 * Math.sin(elapsed * 18)})`;
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(e.r, 0); ctx.lineTo(420, 0); ctx.stroke();
    ctx.restore();
  }
  if (e.elite) {
    ctx.strokeStyle = '#68d8ff';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#68d8ff';
    ctx.beginPath(); ctx.arc(0, 0, e.r + 8 + Math.sin(elapsed * 4) * 2, 0, TAU); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = e.hit ? '#fff' : e.color;
  ctx.shadowBlur = e.type === 'gravebinder' || e.type === 'boss' ? 22 : 10;
  ctx.shadowColor = e.color;
  ctx.beginPath();
  if (e.type === 'boss') {
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + elapsed * 0.2;
      const r = i % 2 ? e.r * 0.72 : e.r;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  } else if (e.type === 'charger') {
    ctx.moveTo(e.r * 1.25, 0);
    ctx.lineTo(-e.r * 0.85, e.r * 0.82);
    ctx.lineTo(-e.r * 0.55, 0);
    ctx.lineTo(-e.r * 0.85, -e.r * 0.82);
    ctx.closePath();
  } else if (e.type === 'gravebinder') {
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      const r = i % 2 ? e.r * 0.72 : e.r;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  } else {
    ctx.arc(0, 0, e.r, 0, TAU);
  }
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#090a0e';
  ctx.beginPath();
  ctx.arc(-e.r * 0.25, -3, 3, 0, TAU);
  ctx.arc(e.r * 0.25, -3, 3, 0, TAU);
  ctx.fill();
  if (e.type === 'gravebinder') {
    ctx.strokeStyle = '#d6c9ff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, e.r * 0.48, 0, TAU); ctx.stroke();
  }
  ctx.restore();

  if (e.hp < e.maxHp || e.elite || e.type === 'boss') {
    const width = e.type === 'boss' ? 160 : Math.max(36, e.r * 2.2);
    ctx.fillStyle = '#1d1116';
    ctx.fillRect(e.x - width / 2, e.y - e.r - 17, width, 6);
    ctx.fillStyle = '#d05b54';
    ctx.fillRect(e.x - width / 2, e.y - e.r - 17, width * clamp(e.hp / e.maxHp, 0, 1), 6);
    if (e.maxShield > 0 && e.shield > 0) {
      ctx.fillStyle = '#5dcff3';
      ctx.fillRect(e.x - width / 2, e.y - e.r - 24, width * clamp(e.shield / e.maxShield, 0, 1), 4);
    }
  }
}

function drawHazard(h) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.shadowBlur = 16 + Math.sin(h.pulse) * 5;
  ctx.shadowColor = '#ff7d41';
  const grad = ctx.createRadialGradient(-5, -7, 2, 0, 0, h.r);
  grad.addColorStop(0, '#ffc56e');
  grad.addColorStop(0.35, '#b64d32');
  grad.addColorStop(1, '#3d1c1c');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, h.r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#f7a04f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, -11); ctx.lineTo(6, 10);
  ctx.moveTo(5, -12); ctx.lineTo(-4, 8);
  ctx.stroke();
  ctx.restore();
}

function drawBullet(b) {
  const color = b.enemy ? '#ef6658' : '#ffd77a';
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = b.r * 1.25;
  ctx.beginPath();
  ctx.moveTo(b.x - b.vx * 0.035, b.y - b.vy * 0.035);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.shadowBlur = 16;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawDrop(d) {
  const color = d.type === 'heart' ? '#e95b61' : '#e6b85c';
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(d.x, d.y, 9 + Math.sin(elapsed * 5) * 2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawParticle(p) {
  ctx.save();
  ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
  ctx.fillStyle = p.color;
  if (p.glow) { ctx.shadowBlur = 12; ctx.shadowColor = p.color; }
  ctx.fillRect(p.x, p.y, p.r, p.r);
  ctx.restore();
}

function drawNova(n) {
  ctx.save();
  ctx.globalAlpha = clamp(n.life / n.max, 0, 1);
  ctx.strokeStyle = '#9be8ff';
  ctx.lineWidth = 14 * (n.life / n.max) + 2;
  ctx.shadowBlur = 28;
  ctx.shadowColor = '#6ed8ff';
  ctx.beginPath();
  ctx.arc(n.x, n.y, n.r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawFloater(f) {
  ctx.save();
  ctx.globalAlpha = clamp(f.life / f.max, 0, 1);
  ctx.fillStyle = f.color;
  ctx.font = `800 ${f.size}px system-ui`;
  ctx.textAlign = 'center';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#000';
  ctx.fillText(f.text, f.x, f.y);
  ctx.restore();
}

function drawLighting() {
  lctx.clearRect(0, 0, W, H);
  lctx.fillStyle = room.mod.id === 'veil' ? 'rgba(2,3,8,.82)' : 'rgba(2,3,8,.42)';
  lctx.fillRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'destination-out';
  punchLight(player.x, player.y, room.mod.id === 'veil' ? 290 : 470, 1);
  bullets.forEach((b) => punchLight(b.x, b.y, b.enemy ? 85 : 110, 0.55));
  hazards.filter((h) => !h.dead).forEach((h) => punchLight(h.x, h.y, 105, 0.38));
  novaWaves.forEach((n) => punchLight(n.x, n.y, Math.max(180, n.r + 120), 0.9));
  lctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(lightCanvas, 0, 0);
}

function punchLight(x, y, radius, alpha) {
  const g = lctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(0.55, `rgba(0,0,0,${alpha * 0.65})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  lctx.fillStyle = g;
  lctx.beginPath();
  lctx.arc(x, y, radius, 0, TAU);
  lctx.fill();
}

function drawPostProcess() {
  const vignette = ctx.createRadialGradient(W / 2, H / 2, 220, W / 2, H / 2, 760);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.72, 'rgba(0,0,0,.08)');
  vignette.addColorStop(1, 'rgba(0,0,0,.72)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,80,70,${flash * 0.35})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalAlpha = 0.035;
  ctx.fillStyle = '#fff';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.globalAlpha = 1;
}

function drawHud() {
  if (!player) return;
  ctx.fillStyle = 'rgba(5,7,12,.86)';
  ctx.fillRect(24, 22, 355, 104);
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.strokeRect(24, 22, 355, 104);
  ctx.fillStyle = '#302026';
  ctx.fillRect(44, 50, 270, 14);
  ctx.fillStyle = '#d85c59';
  ctx.fillRect(44, 50, 270 * clamp(player.hp / player.maxHp, 0, 1), 14);
  ctx.fillStyle = '#f4ead7';
  ctx.font = '700 16px system-ui';
  ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, 44, 43);
  ctx.fillStyle = '#a99f91';
  ctx.font = '13px system-ui';
  ctx.fillText(player.weapon, 44, 85);

  ctx.fillStyle = '#182b34';
  ctx.fillRect(44, 101, 270, 10);
  ctx.fillStyle = player.nova >= 100 ? '#a7f0ff' : '#58bad8';
  ctx.fillRect(44, 101, 270 * (player.nova / 100), 10);
  ctx.fillStyle = '#b7dce6';
  ctx.font = '11px system-ui';
  ctx.fillText(player.nova >= 100 ? 'ASH NOVA READY · Q / Y' : `ASH NOVA ${Math.floor(player.nova)}%`, 44, 97);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#f4ead7';
  ctx.font = '800 18px system-ui';
  ctx.fillText(`CHAMBER ${roomNo}/10`, W - 34, 43);
  ctx.fillStyle = PALETTES[room?.theme || 0].accent;
  ctx.font = '700 13px system-ui';
  ctx.fillText(room?.mod.name || '', W - 34, 64);
  ctx.fillStyle = '#e6b85c';
  ctx.font = '800 19px system-ui';
  ctx.fillText(score.toLocaleString(), W - 34, 89);

  if (combo > 1) {
    const alpha = clamp(comboTimer / 1.4, 0.35, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffcf75';
    ctx.font = '900 28px system-ui';
    ctx.fillText(`x${comboMultiplier.toFixed(2)}`, W - 34, 126);
    ctx.fillStyle = '#d8c6a0';
    ctx.font = '700 12px system-ui';
    ctx.fillText(`${combo} KILL COMBO`, W - 34, 145);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';

  const dashReady = clamp((elapsed - player.dashAt) / player.dashCd, 0, 1);
  ctx.fillStyle = '#242a36';
  ctx.fillRect(44, H - 46, 150, 8);
  ctx.fillStyle = '#d9c28a';
  ctx.fillRect(44, H - 46, 150 * dashReady, 8);
  ctx.fillStyle = '#a99f91';
  ctx.font = '12px system-ui';
  ctx.fillText('DASH', 44, H - 54);
}

function drawTouchControls() {
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  const lx = touch.left?.startX || 115;
  const ly = touch.left?.startY || H - 115;
  ctx.beginPath(); ctx.arc(lx, ly, 54, 0, TAU); ctx.stroke();
  if (touch.left) { ctx.beginPath(); ctx.arc(touch.left.x, touch.left.y, 24, 0, TAU); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(W - 95, H - 102, 42, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(W - 205, H - 102, 42, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '800 12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('DASH', W - 95, H - 98);
  ctx.fillText('NOVA', W - 205, H - 98);
  ctx.restore();
}

function armory() {
  const items = [
    ['ironHeart', 'Iron Heart', '+10 starting vitality per rank', 12],
    ['edge', 'Honed Edge', '+2 starting damage per rank', 14],
    ['boots', 'Wayfarer Boots', '+12 movement speed per rank', 10]
  ];
  $('#armory').innerHTML = `<p class="eyebrow">PERMANENT ARMORY</p><h2>Spend Embers</h2><p>Available: <strong>${meta.embers}</strong></p>${items.map(([key, name, desc, base]) => {
    const rank = meta.unlocks[key];
    const cost = base * (rank + 1);
    return `<div class="shop-row"><span><strong>${name} ${rank}/5</strong><br><small>${desc}</small></span><button data-buy="${key}" ${rank >= 5 ? 'disabled' : ''}>${rank >= 5 ? 'MAX' : cost + ' embers'}</button></div>`;
  }).join('')}<button id="armoryBack" class="secondary">Back</button>`;
  show('armory');
  document.querySelectorAll('[data-buy]').forEach((button) => {
    button.onclick = () => {
      const key = button.dataset.buy;
      const base = { ironHeart: 12, edge: 14, boots: 10 }[key];
      const cost = base * (meta.unlocks[key] + 1);
      if (meta.embers >= cost && meta.unlocks[key] < 5) {
        meta.embers -= cost;
        meta.unlocks[key]++;
        saveMeta();
        armory();
      } else toast('Not enough embers');
    };
  });
  $('#armoryBack').onclick = () => show('menu');
}

function scoresPanel() {
  const rows = meta.scores.length
    ? meta.scores.map((s, i) => `<div class="score-row"><span>#${i + 1} ${s.win ? 'Escape' : 'Room ' + s.rooms}</span><strong>${s.score.toLocaleString()}</strong></div>`).join('')
    : '<p class="fine">No runs recorded.</p>';
  $('#scores').innerHTML = `<p class="eyebrow">HALL OF RECORDS</p><h2>Best Runs</h2>${rows}<button id="scoresBack" class="secondary">Back</button>`;
  show('scores');
  $('#scoresBack').onclick = () => show('menu');
}

function togglePause() {
  if (state !== 'playing' && state !== 'pause') return;
  paused = !paused;
  if (paused) {
    state = 'pause';
    $('#pause').classList.add('visible');
  } else {
    state = 'playing';
    $('#pause').classList.remove('visible');
  }
}

function canvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return { x: (clientX - rect.left) / rect.width * W, y: (clientY - rect.top) / rect.height * H };
}

function handleTouchStart(event) {
  event.preventDefault();
  touch.active = true;
  for (const t of event.changedTouches) {
    const p = canvasPoint(t.clientX, t.clientY);
    if (Math.hypot(p.x - (W - 95), p.y - (H - 102)) < 60) { dash(0, 0); continue; }
    if (Math.hypot(p.x - (W - 205), p.y - (H - 102)) < 60) { activateNova(); continue; }
    if (p.x < W * 0.45 && !touch.left) touch.left = { id: t.identifier, startX: p.x, startY: p.y, x: p.x, y: p.y };
    else if (!touch.right) touch.right = { id: t.identifier, startX: p.x, startY: p.y, x: p.x, y: p.y };
  }
}

function handleTouchMove(event) {
  event.preventDefault();
  for (const t of event.changedTouches) {
    const p = canvasPoint(t.clientX, t.clientY);
    if (touch.left?.id === t.identifier) { touch.left.x = p.x; touch.left.y = p.y; }
    if (touch.right?.id === t.identifier) { touch.right.x = p.x; touch.right.y = p.y; }
  }
}

function handleTouchEnd(event) {
  event.preventDefault();
  for (const t of event.changedTouches) {
    if (touch.left?.id === t.identifier) touch.left = null;
    if (touch.right?.id === t.identifier) touch.right = null;
  }
}

let audioCtx;
function sound(type) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    const map = {
      shot: [240, 0.035, 0.025, 'square'],
      hurt: [95, 0.12, 0.06, 'sawtooth'],
      kill: [180, 0.08, 0.025, 'triangle'],
      dash: [420, 0.07, 0.025, 'sine'],
      nova: [110, 0.42, 0.09, 'sawtooth'],
      pickup: [620, 0.08, 0.025, 'sine'],
      explode: [70, 0.22, 0.08, 'square'],
      charge: [160, 0.14, 0.04, 'sawtooth']
    };
    const [frequency, duration, volume, wave] = map[type] || map.shot;
    osc.type = wave;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(35, frequency * 0.55), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch { }
}

addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'Escape') togglePause();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
});
addEventListener('keyup', (event) => { keys[event.code] = false; });
canvas.addEventListener('mousemove', (event) => {
  const p = canvasPoint(event.clientX, event.clientY);
  mouse.x = p.x;
  mouse.y = p.y;
});
canvas.addEventListener('mousedown', () => { mouse.down = true; });
addEventListener('mouseup', () => { mouse.down = false; });
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

$('#startBtn').onclick = resetRun;
$('#armoryBtn').onclick = armory;
$('#scoresBtn').onclick = scoresPanel;
$('#resumeBtn').onclick = togglePause;
$('#quitBtn').onclick = () => endRun(false);

function pollGamepadPause() {
  const gp = navigator.getGamepads?.()[0];
  const pressed = !!gp?.buttons[9]?.pressed;
  if (pressed && !gamepadPause) togglePause();
  gamepadPause = pressed;
}

function loop(time) {
  const dt = Math.min(0.033, (time - last) / 1000 || 0);
  last = time;
  pollGamepadPause();
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

updateMeta();
show('menu');
requestAnimationFrame(loop);
})();