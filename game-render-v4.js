'use strict';

function draw() {
  g.clearRect(0, 0, W, H);
  g.save();
  const sx = shake ? Math.round(rand(-shake, shake)) : 0;
  const sy = shake ? Math.round(rand(-shake, shake)) : 0;
  g.translate(sx, sy);
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
    waves.forEach(drawWave);
    bolts.forEach(drawBolt);
    floaters.forEach(drawFloater);
    drawVeil();
  }
  g.restore();
  drawHud();
  if (touch.active || matchMedia('(pointer: coarse)').matches) drawTouchControls();
  drawPost();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(screen, 0, 0, canvas.width, canvas.height);
}

function tileVariant(x, y) {
  return Math.abs(((x * 13) ^ (y * 7) ^ (roomNo * 17))) % PixelArt.tiles.floor.length;
}

function drawFloor() {
  const palette = PALETTES[room?.theme || 0];
  g.fillStyle = palette.floor2;
  g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 8) {
    for (let x = 0; x < W; x += 8) {
      const tile = PixelArt.tiles.floor[tileVariant(x / 8, y / 8)];
      g.drawImage(tile, x, y);
      if (room?.theme === 1) {
        g.fillStyle = 'rgba(110,36,74,.14)';
        g.fillRect(x, y, 8, 8);
      } else if (room?.theme === 2) {
        g.fillStyle = 'rgba(132,70,26,.13)';
        g.fillRect(x, y, 8, 8);
      }
    }
  }
  if (room) {
    for (let i = 0; i < room.runes.length; i++) {
      const r = room.runes[i];
      const pulse = Math.floor(elapsed * 4 + i) % 2;
      g.globalAlpha = pulse ? 0.4 : 0.23;
      g.strokeStyle = palette.accent;
      g.strokeRect(Math.round(r.x - r.r / 2), Math.round(r.y - r.r / 2), r.r, r.r);
      g.fillRect(Math.round(r.x - 1), Math.round(r.y - 1), 3, 3);
      g.fillRect(Math.round(r.x - r.r / 3), Math.round(r.y), Math.max(1, Math.round(r.r * 0.65)), 1);
      g.fillRect(Math.round(r.x), Math.round(r.y - r.r / 3), 1, Math.max(1, Math.round(r.r * 0.65)));
    }
    g.globalAlpha = 1;
  }
}

function drawShadows() {
  g.fillStyle = 'rgba(3,3,8,.55)';
  hazards.filter((h) => !h.dead).forEach((h) => g.fillRect(Math.round(h.x - 5), Math.round(h.y + 3), 10, 3));
  enemies.forEach((e) => {
    const width = e.type === 'warden' ? 24 : e.type === 'revenant' ? 19 : e.type === 'brute' ? 13 : 10;
    g.fillRect(Math.round(e.x - width / 2), Math.round(e.y + e.r - 1), width, Math.max(2, Math.round(e.r / 2)));
  });
  if (player) g.fillRect(Math.round(player.x - 5), Math.round(player.y + 3), 10, 3);
}

function drawObs(o) {
  const top = PixelArt.tiles.wallTop;
  const mid = PixelArt.tiles.wallMid;
  g.fillStyle = PixelArt.P.wall0;
  g.fillRect(o.x, o.y, o.w, o.h);
  for (let x = o.x; x < o.x + o.w; x += 8) {
    g.drawImage(top, x, o.y, Math.min(8, o.x + o.w - x), 8);
  }
  for (let y = o.y + 8; y < o.y + o.h; y += 8) {
    for (let x = o.x; x < o.x + o.w; x += 8) {
      g.drawImage(mid, x, y, Math.min(8, o.x + o.w - x), Math.min(8, o.y + o.h - y));
    }
  }
  g.fillStyle = PixelArt.P.ink;
  g.fillRect(o.x, o.y + o.h - 2, o.w, 2);
}

function isPlayerMoving() {
  if (keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || touch.left) return true;
  const gp = navigator.getGamepads?.()[0];
  return !!gp && (Math.abs(gp.axes[0] || 0) > 0.2 || Math.abs(gp.axes[1] || 0) > 0.2);
}

function drawPlayer() {
  if (!player) return;
  const flicker = player.inv > 0 && Math.floor(elapsed * 20) % 2;
  if (flicker) return;
  const dir = PixelArt.direction(player.aim);
  const moving = isPlayerMoving();
  let action = moving ? 'walk' : 'idle';
  if (player.dashTime > 0) action = 'dash';
  else if (elapsed - player.lastShot < 0.12) action = 'shoot';
  else if (player.inv > 0.05 && flash > 0.05) action = 'hurt';
  const frame = Math.floor(elapsed * (action === 'walk' ? 8 : 10)) % 2;
  const sprite = PixelArt.spriteFor('player', action, dir, frame);
  PixelArt.draw(g, sprite, player.x, player.y, { anchorY: sprite.height - 1 });
}

function enemyDirection(e) {
  if (e.type === 'charger' && e.charge > 0) return PixelArt.direction(Math.atan2(e.cvy, e.cvx));
  return PixelArt.direction(Math.atan2(player.y - e.y, player.x - e.x));
}

function enemyAction(e) {
  if (e.hit > 0.02) return 'hurt';
  if (e.type === 'shooter' && e.attack < 0.25) return 'shoot';
  if (e.type === 'brute' && e.attack < 0.3) return 'attack';
  if (e.type === 'stalker' && dist(e, player) < e.r + player.r + 10) return 'attack';
  return 'walk';
}

function drawEnemy(e) {
  const x = Math.round(e.x);
  const y = Math.round(e.y);
  if (e.type === 'charger' && e.telegraph > 0) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    g.strokeStyle = Math.floor(elapsed * 18) % 2 ? PixelArt.P.red2 : PixelArt.P.red0;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * 105, y + Math.sin(a) * 105);
    g.stroke();
  }
  if ((e.type === 'revenant' && e.slam > 0) || (e.type === 'warden' && e.attack < 0.2)) {
    g.strokeStyle = PixelArt.P.gold2;
    g.strokeRect(x - e.r - 4, y - e.r - 4, e.r * 2 + 8, e.r * 2 + 8);
  }
  if (e.elite && e.maxShield > 0) {
    g.strokeStyle = PixelArt.P.cyan2;
    g.strokeRect(x - e.r - 2, y - e.r - 2, e.r * 2 + 4, e.r * 2 + 4);
    if (Math.floor(elapsed * 6) % 2) g.fillRect(x - e.r - 2, y - e.r - 2, 2, 2);
  }
  const frame = Math.floor(elapsed * 7 + e.phase * 2) % 2;
  let sprite;
  if (['stalker', 'brute', 'shooter'].includes(e.type)) {
    sprite = PixelArt.spriteFor(e.type, enemyAction(e), enemyDirection(e), frame);
  } else {
    sprite = PixelArt.spriteFor(e.type, 'idle', 'down', frame);
  }
  if (e.hit > 0) {
    g.save();
    g.globalAlpha = 0.65;
    PixelArt.draw(g, sprite, x, y, { anchorY: sprite.height - 1 });
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = PixelArt.P.white;
    g.fillRect(x - sprite.width / 2, y - sprite.height + 1, sprite.width, sprite.height);
    g.restore();
  } else {
    PixelArt.draw(g, sprite, x, y, { anchorY: sprite.height - 1 });
  }
  if (e.burn > 0) {
    const fy = y - e.r - 5;
    g.fillStyle = Math.floor(elapsed * 12) % 2 ? PixelArt.P.gold2 : PixelArt.P.red2;
    g.fillRect(x - 2, fy, 2, 3);
    g.fillStyle = PixelArt.P.orange;
    g.fillRect(x + 1, fy + 1, 2, 2);
  }
  if (e.hp < e.maxHp || e.type === 'revenant' || e.type === 'warden') {
    const width = e.type === 'warden' ? 44 : e.type === 'revenant' ? 35 : Math.max(11, e.r * 2 + 2);
    g.fillStyle = PixelArt.P.red0;
    g.fillRect(x - Math.floor(width / 2), y - e.r - 8, width, 3);
    g.fillStyle = PixelArt.P.red2;
    g.fillRect(x - Math.floor(width / 2) + 1, y - e.r - 7, Math.floor((width - 2) * clamp(e.hp / e.maxHp, 0, 1)), 1);
    if (e.shield > 0) {
      g.fillStyle = PixelArt.P.cyan1;
      g.fillRect(x - Math.floor(width / 2), y - e.r - 11, Math.floor(width * clamp(e.shield / e.maxShield, 0, 1)), 2);
    }
  }
}

function drawHazard(h) {
  PixelArt.draw(g, PixelArt.props.urn, h.x, h.y + 2, { anchorY: PixelArt.props.urn.height - 1 });
  if (h.hp < h.maxHp) {
    g.fillStyle = PixelArt.P.red2;
    g.fillRect(Math.round(h.x - 4), Math.round(h.y - 8), Math.max(1, Math.round(8 * h.hp / h.maxHp)), 1);
  }
}

function drawBullet(b) {
  const angle = Math.atan2(b.vy, b.vx);
  const sprite = b.enemy ? PixelArt.fx.enemyBullet : PixelArt.fx.playerBullet;
  g.save();
  g.translate(Math.round(b.x), Math.round(b.y));
  g.rotate(angle);
  g.drawImage(sprite, -Math.floor(sprite.width / 2), -Math.floor(sprite.height / 2));
  g.restore();
}

function drawDrop(d) {
  const bob = Math.round(Math.sin(elapsed * 5) * 1);
  let sprite = PixelArt.props.ember;
  if (d.type === 'heart') sprite = PixelArt.props.heart;
  else if (d.type === 'weapon') sprite = PixelArt.props[d.weapon] || PixelArt.props.pistol;
  PixelArt.draw(g, sprite, d.x, d.y + bob, { anchorY: sprite.height - 1 });
}

function drawParticle(p) {
  g.globalAlpha = clamp(p.life / p.max, 0, 1);
  g.fillStyle = p.color;
  g.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, p.r), Math.max(1, p.r));
  g.globalAlpha = 1;
}

function drawWave(w) {
  g.globalAlpha = clamp(w.life / w.max, 0, 1);
  g.strokeStyle = w.color;
  const r = Math.round(w.r);
  g.strokeRect(Math.round(w.x - r), Math.round(w.y - r / 2), r * 2, r);
  if (r < 18) PixelArt.draw(g, PixelArt.fx.nova, w.x, w.y + 8, { anchorY: 8, alpha: 0.65 });
  g.globalAlpha = 1;
}

function drawBolt(b) {
  g.globalAlpha = b.life / b.max;
  g.strokeStyle = PixelArt.P.cyan2;
  g.beginPath();
  g.moveTo(Math.round(b.x1), Math.round(b.y1));
  const steps = 4;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = b.x1 + (b.x2 - b.x1) * t + (i % 2 ? 2 : -2);
    const y = b.y1 + (b.y2 - b.y1) * t + (i % 2 ? -1 : 1);
    g.lineTo(Math.round(x), Math.round(y));
  }
  g.lineTo(Math.round(b.x2), Math.round(b.y2));
  g.stroke();
  g.globalAlpha = 1;
}

function drawFloater(f) {
  g.globalAlpha = clamp(f.life / f.max, 0, 1);
  g.fillStyle = f.color;
  g.font = 'bold 5px monospace';
  g.textAlign = 'center';
  g.fillText(f.text, Math.round(f.x), Math.round(f.y));
  g.globalAlpha = 1;
}

function drawVeil() {
  if (room?.mod.id !== 'veil' || !player) return;
  g.save();
  g.fillStyle = 'rgba(4,4,12,.82)';
  g.beginPath();
  g.rect(0, 0, W, H);
  g.arc(player.x, player.y, 54, 0, TAU, true);
  g.fill('evenodd');
  g.restore();
}

function drawPanel(x, y, w, h) {
  g.fillStyle = PixelArt.P.ink;
  g.fillRect(x, y, w, h);
  g.fillStyle = PixelArt.P.outline;
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = PixelArt.P.steel1;
  g.fillRect(x + 2, y + 2, w - 4, 1);
  g.fillStyle = PixelArt.P.shadow;
  g.fillRect(x + 2, y + h - 3, w - 4, 1);
}

function drawWeaponIcon(id, x, y) {
  const icon = PixelArt.props[id] || PixelArt.props.pistol;
  PixelArt.draw(g, icon, x, y, { anchorX: 0, anchorY: 0 });
}

function drawHud() {
  if (!player || state === 'menu') return;
  drawPanel(3, 3, 111, 31);
  g.drawImage(PixelArt.ui.portrait, 5, 5);
  g.fillStyle = PixelArt.P.red0;
  g.fillRect(25, 8, 70, 6);
  g.fillStyle = PixelArt.P.red1;
  g.fillRect(26, 9, Math.floor(68 * clamp(player.hp / player.maxHp, 0, 1)), 4);
  g.fillStyle = PixelArt.P.red2;
  g.fillRect(26, 9, Math.floor(68 * clamp(player.hp / player.maxHp, 0, 1)), 1);
  g.fillStyle = PixelArt.P.pale;
  g.font = 'bold 5px monospace';
  g.textAlign = 'left';
  g.fillText(`${Math.ceil(player.hp)}/${player.maxHp}`, 98, 13);
  drawWeaponIcon(player.weapon, 25, 17);
  g.fillStyle = WEAPONS[player.weapon].color;
  g.fillText(`${WEAPONS[player.weapon].short} R${player.weaponRanks[player.weapon]}`, 41, 23);
  g.fillStyle = PixelArt.P.cyan0;
  g.fillRect(25, 27, 70, 4);
  g.fillStyle = player.nova >= 100 ? PixelArt.P.pale : PixelArt.P.cyan1;
  g.fillRect(26, 28, Math.floor(68 * player.nova / 100), 2);
  g.fillStyle = PixelArt.P.pale;
  g.fillText(player.nova >= 100 ? 'NOVA!' : `${Math.floor(player.nova)}%`, 98, 31);

  drawPanel(W - 85, 3, 82, 27);
  g.textAlign = 'right';
  g.fillStyle = PixelArt.P.pale;
  g.fillText(`CHAMBER ${roomNo}/10`, W - 7, 10);
  g.fillStyle = PALETTES[room?.theme || 0].accent;
  g.fillText(room?.mod.name || '', W - 7, 17);
  g.fillStyle = PixelArt.P.gold2;
  g.fillText(score.toLocaleString().padStart(7, '0'), W - 7, 25);
  if (combo > 1) {
    drawPanel(W - 66, 33, 63, 16);
    g.fillStyle = PixelArt.P.gold2;
    g.font = 'bold 8px monospace';
    g.fillText(`x${comboMultiplier.toFixed(2)}`, W - 7, 42);
    g.font = 'bold 5px monospace';
    g.fillStyle = PixelArt.P.pale;
    g.fillText(`${combo} COMBO`, W - 7, 48);
  }
  g.textAlign = 'left';
  drawPanel(3, H - 18, 119, 15);
  g.fillStyle = bountyComplete ? PixelArt.P.green1 : PixelArt.P.gold1;
  g.fillText(`BOUNTY ${currentBounty?.name || ''}`, 6, H - 11);
  g.fillStyle = PixelArt.P.pale;
  g.fillText(bountyComplete ? 'COMPLETE' : `${Math.min(bountyProgress, currentBounty?.target || 0)}/${currentBounty?.target || 0}`, 6, H - 5);

  const ready = clamp((elapsed - player.dashAt) / player.dashCd, 0, 1);
  drawPanel(127, H - 14, 51, 11);
  g.fillStyle = PixelArt.P.floor0;
  g.fillRect(131, H - 9, 42, 3);
  g.fillStyle = PixelArt.P.pale;
  g.fillRect(131, H - 9, Math.floor(42 * ready), 3);
  g.fillText('DASH', 131, H - 11);

  drawPanel(182, H - 16, 82, 13);
  let ix = 185;
  for (const id of Object.keys(WEAPONS)) {
    const unlocked = player.arsenal[id];
    g.globalAlpha = unlocked ? 1 : 0.25;
    drawWeaponIcon(id, ix, H - 14);
    if (id === player.weapon) {
      g.fillStyle = PixelArt.P.gold2;
      g.fillRect(ix - 1, H - 4, 17, 1);
    }
    g.globalAlpha = 1;
    ix += 27;
  }
}

function drawTouchControls() {
  g.globalAlpha = 0.5;
  g.strokeStyle = PixelArt.P.pale;
  const lx = touch.left?.startX || 29;
  const ly = touch.left?.startY || H - 29;
  g.strokeRect(lx - 13, ly - 13, 26, 26);
  if (touch.left) g.strokeRect(touch.left.x - 5, touch.left.y - 5, 10, 10);
  g.strokeRect(W - 26, H - 26, 18, 18);
  g.strokeRect(W - 52, H - 26, 18, 18);
  g.strokeRect(W - 78, H - 26, 18, 18);
  g.fillStyle = PixelArt.P.pale;
  g.font = 'bold 4px monospace';
  g.textAlign = 'center';
  g.fillText('DASH', W - 17, H - 16);
  g.fillText('NOVA', W - 43, H - 16);
  g.fillText('SWAP', W - 69, H - 16);
  g.globalAlpha = 1;
}

function drawPost() {
  g.fillStyle = 'rgba(0,0,0,.12)';
  for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
  if (flash > 0) {
    g.fillStyle = `rgba(255,80,70,${flash * 0.45})`;
    g.fillRect(0, 0, W, H);
  }
  g.strokeStyle = PixelArt.P.ink;
  g.lineWidth = 4;
  g.strokeRect(1, 1, W - 2, H - 2);
}

function armory() {
  const items = [
    ['ironHeart', 'IRON HEART', '+10 starting vitality', 12],
    ['edge', 'HONED EDGE', '+2 starting damage', 14],
    ['boots', 'WAYFARER BOOTS', '+3 movement speed', 10]
  ];
  $('#armory').innerHTML = `<p class="eyebrow">PERMANENT ARMORY</p><h2>SPEND EMBERS</h2><p>AVAILABLE: <strong>${meta.embers}</strong></p>${items.map(([key, name, desc, base]) => {
    const rank = meta.unlocks[key];
    const cost = base * (rank + 1);
    return `<div class="shop-row"><span><strong>${name} ${rank}/5</strong><br><small>${desc}</small></span><button data-buy="${key}" ${rank >= 5 ? 'disabled' : ''}>${rank >= 5 ? 'MAX' : cost + ' EMBERS'}</button></div>`;
  }).join('')}<button id="armoryBack" class="secondary">BACK</button>`;
  show('armory');
  document.querySelectorAll('[data-buy]').forEach((button) => button.onclick = () => {
    const key = button.dataset.buy;
    const base = { ironHeart: 12, edge: 14, boots: 10 }[key];
    const cost = base * (meta.unlocks[key] + 1);
    if (meta.embers >= cost && meta.unlocks[key] < 5) {
      meta.embers -= cost;
      meta.unlocks[key]++;
      saveMeta();
      armory();
    } else toast('NOT ENOUGH EMBERS');
  });
  $('#armoryBack').onclick = () => show('menu');
}

function scoresPanel() {
  const rows = meta.scores.length
    ? meta.scores.map((s, i) => `<div class="score-row"><span>#${i + 1} ${s.win ? 'ESCAPE' : 'ROOM ' + s.rooms}</span><strong>${s.score.toLocaleString()}</strong></div>`).join('')
    : '<p class="fine">NO RUNS RECORDED.</p>';
  const ach = Object.values(meta.achievements).filter(Boolean).length;
  $('#scores').innerHTML = `<p class="eyebrow">HALL OF RECORDS</p><h2>BEST RUNS</h2><p>ACHIEVEMENTS ${ach}/4</p>${rows}<button id="scoresBack" class="secondary">BACK</button>`;
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
    if (Math.hypot(p.x - (W - 17), p.y - (H - 17)) < 12) { dash(0, 0); continue; }
    if (Math.hypot(p.x - (W - 43), p.y - (H - 17)) < 12) { activateNova(); continue; }
    if (Math.hypot(p.x - (W - 69), p.y - (H - 17)) < 12) { cycleWeapon(); continue; }
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

function sound(type) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    const map = {
      shot: [260, .035, .025, 'square'], scatter: [110, .07, .04, 'square'], arc: [520, .08, .025, 'square'],
      hurt: [90, .12, .06, 'sawtooth'], kill: [180, .08, .025, 'triangle'], dash: [420, .07, .025, 'square'],
      nova: [110, .42, .09, 'sawtooth'], pickup: [620, .08, .025, 'square'], explode: [70, .22, .08, 'square'],
      charge: [160, .14, .04, 'sawtooth'], slam: [55, .28, .08, 'square'], swap: [360, .06, .02, 'square'], bounty: [760, .2, .035, 'square']
    };
    const [frequency, duration, volume, wave] = map[type] || map.shot;
    osc.type = wave;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(35, frequency * .55), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
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