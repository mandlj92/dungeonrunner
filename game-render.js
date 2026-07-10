function draw() {
  g.clearRect(0, 0, W, H); g.save(); const sx = shake ? Math.round(rand(-shake, shake)) : 0; const sy = shake ? Math.round(rand(-shake, shake)) : 0; g.translate(sx, sy);
  drawFloor();
  if (room) {
    drawShadows(); room.obs.forEach(drawObs); hazards.filter((h) => !h.dead).forEach(drawHazard); drops.forEach(drawDrop);
    bullets.forEach(drawBullet); enemies.forEach(drawEnemy); if (player) drawPlayer(); particles.forEach(drawParticle); waves.forEach(drawWave); bolts.forEach(drawBolt); floaters.forEach(drawFloater); drawVeil();
  }
  g.restore(); drawHud(); if (touch.active || matchMedia('(pointer: coarse)').matches) drawTouchControls(); drawPost();
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.imageSmoothingEnabled = false; ctx.drawImage(screen, 0, 0, canvas.width, canvas.height);
}

function drawFloor() {
  const p = PALETTES[room?.theme || 0]; g.fillStyle = p.floor2; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 8) for (let x = 0; x < W; x += 8) {
    const odd = ((x / 8 + y / 8) & 1); g.fillStyle = odd ? p.floor : p.tile; g.fillRect(x, y, 8, 8);
    g.fillStyle = odd ? p.floor2 : p.floor; g.fillRect(x + ((x + y) % 3), y + 7, 2, 1);
  }
  if (room) for (let i = 0; i < room.runes.length; i++) { const r = room.runes[i]; g.globalAlpha = 0.25 + 0.12 * Math.sin(elapsed * 2 + i); g.strokeStyle = p.accent; g.lineWidth = 1; g.strokeRect(Math.round(r.x - r.r / 2), Math.round(r.y - r.r / 2), r.r, r.r); g.fillRect(Math.round(r.x), Math.round(r.y), 1, 1); }
  g.globalAlpha = 1;
}

function drawShadows() {
  g.fillStyle = 'rgba(0,0,0,.45)'; hazards.filter((h) => !h.dead).forEach((h) => g.fillRect(Math.round(h.x - 4), Math.round(h.y + 4), 9, 3));
  enemies.forEach((e) => g.fillRect(Math.round(e.x - e.r), Math.round(e.y + e.r - 1), e.r * 2, Math.max(2, e.r / 2)));
  if (player) g.fillRect(Math.round(player.x - 5), Math.round(player.y + 4), 10, 3);
}

function drawObs(o) {
  const p = PALETTES[room.theme]; g.fillStyle = p.wall; g.fillRect(o.x, o.y, o.w, o.h); g.fillStyle = p.edge; g.fillRect(o.x, o.y, o.w, 2); g.fillRect(o.x, o.y, 2, o.h); g.fillStyle = C.black; g.fillRect(o.x + 2, o.y + o.h - 2, o.w - 2, 2);
  for (let y = o.y + 7; y < o.y + o.h; y += 7) { g.fillStyle = p.floor2; g.fillRect(o.x + 2, y, o.w - 2, 1); }
}

function drawPlayer() {
  const x = Math.round(player.x), y = Math.round(player.y), a = player.aim; const flicker = player.inv > 0 && Math.floor(elapsed * 18) % 2;
  if (flicker) return; g.save(); g.translate(x, y); g.fillStyle = '#382838'; g.fillRect(-4, -2, 8, 7); g.fillStyle = C.pale; g.fillRect(-3, -5, 6, 5); g.fillStyle = '#704838'; g.fillRect(-3, -4, 6, 2); g.fillStyle = C.cyan; g.fillRect(-1, -2, 2, 2);
  g.fillStyle = WEAPONS[player.weapon].color; const gx = Math.round(Math.cos(a) * 7), gy = Math.round(Math.sin(a) * 7); g.fillRect(gx - 1, gy - 1, 4, 3); g.restore();
}

function drawEnemy(e) {
  const x = Math.round(e.x), y = Math.round(e.y); if (e.type === 'charger' && e.telegraph > 0) { const a = Math.atan2(player.y - e.y, player.x - e.x); g.strokeStyle = Math.floor(elapsed * 16) % 2 ? '#ff5068' : '#802840'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 105, y + Math.sin(a) * 105); g.stroke(); }
  if ((e.type === 'revenant' && e.slam > 0) || (e.type === 'warden' && e.attack < 0.2)) { g.strokeStyle = '#f0c858'; g.strokeRect(x - e.r - 4, y - e.r - 4, e.r * 2 + 8, e.r * 2 + 8); }
  if (e.elite && e.maxShield > 0) { g.strokeStyle = C.cyan; g.strokeRect(x - e.r - 2, y - e.r - 2, e.r * 2 + 4, e.r * 2 + 4); }
  g.save(); g.translate(x, y); g.fillStyle = e.hit ? C.white : e.color;
  if (e.type === 'stalker') { g.fillRect(-4, -4, 8, 8); g.fillStyle = C.dark; g.fillRect(-3, -5, 2, 2); g.fillRect(2, -5, 2, 2); }
  else if (e.type === 'brute') { g.fillRect(-6, -5, 12, 10); g.fillStyle = '#703830'; g.fillRect(-7, -2, 2, 6); g.fillRect(5, -2, 2, 6); }
  else if (e.type === 'shooter') { g.fillRect(-4, -5, 8, 10); g.fillStyle = C.gold; g.fillRect(-6, -1, 12, 3); }
  else if (e.type === 'charger') { g.beginPath(); g.moveTo(6, 0); g.lineTo(-5, 5); g.lineTo(-3, 0); g.lineTo(-5, -5); g.fill(); }
  else if (e.type === 'gravebinder') { g.fillRect(-5, -6, 10, 12); g.fillStyle = '#c8b8f0'; g.fillRect(-2, -4, 4, 4); g.fillStyle = C.dark; g.fillRect(-1, -3, 1, 1); g.fillRect(1, -3, 1, 1); }
  else if (e.type === 'revenant') { g.fillRect(-9, -9, 18, 18); g.fillStyle = '#b8c0d0'; g.fillRect(-6, -12, 12, 5); g.fillStyle = '#303848'; g.fillRect(-8, 5, 5, 7); g.fillRect(3, 5, 5, 7); }
  else if (e.type === 'warden') { g.fillRect(-12, -12, 24, 24); g.fillStyle = C.gold; for (let i = -10; i <= 8; i += 6) g.fillRect(i, -16, 4, 6); g.fillStyle = C.dark; g.fillRect(-5, -3, 3, 3); g.fillRect(3, -3, 3, 3); }
  if (e.burn > 0) { g.fillStyle = Math.floor(elapsed * 12) % 2 ? '#ffb040' : '#e05030'; g.fillRect(-2, -e.r - 4, 2, 3); g.fillRect(2, -e.r - 3, 2, 2); }
  g.restore();
  if (e.hp < e.maxHp || e.type === 'revenant' || e.type === 'warden') { const width = e.type === 'warden' ? 42 : e.type === 'revenant' ? 34 : Math.max(10, e.r * 2 + 2); g.fillStyle = '#301820'; g.fillRect(x - Math.floor(width / 2), y - e.r - 6, width, 2); g.fillStyle = C.red; g.fillRect(x - Math.floor(width / 2), y - e.r - 6, Math.floor(width * clamp(e.hp / e.maxHp, 0, 1)), 2); }
}

function drawHazard(h) { const x = Math.round(h.x), y = Math.round(h.y); g.fillStyle = '#502028'; g.fillRect(x - 4, y - 4, 8, 9); g.fillStyle = Math.floor(h.pulse * 2) % 2 ? '#f0a040' : '#d06038'; g.fillRect(x - 2, y - 3, 4, 4); g.fillStyle = C.gold; g.fillRect(x, y - 5, 1, 2); }
function drawBullet(b) { g.strokeStyle = b.color || (b.enemy ? '#f06050' : C.gold); g.beginPath(); g.moveTo(Math.round(b.px), Math.round(b.py)); g.lineTo(Math.round(b.x), Math.round(b.y)); g.stroke(); g.fillStyle = b.color || (b.enemy ? '#f06050' : C.gold); g.fillRect(Math.round(b.x - b.r / 2), Math.round(b.y - b.r / 2), Math.max(1, Math.round(b.r)), Math.max(1, Math.round(b.r))); }
function drawDrop(d) { const x = Math.round(d.x), y = Math.round(d.y + Math.sin(elapsed * 5) * 1); if (d.type === 'heart') { g.fillStyle = C.red; g.fillRect(x - 3, y - 2, 6, 4); g.fillRect(x - 2, y + 2, 4, 2); } else if (d.type === 'weapon') { g.fillStyle = WEAPONS[d.weapon].color; g.fillRect(x - 4, y - 3, 8, 6); g.fillStyle = C.white; g.fillRect(x - 1, y - 5, 2, 2); } else { g.fillStyle = C.gold; g.fillRect(x - 2, y - 3, 5, 6); g.fillStyle = C.white; g.fillRect(x - 1, y - 2, 1, 2); } }
function drawParticle(p) { g.globalAlpha = clamp(p.life / p.max, 0, 1); g.fillStyle = p.color; g.fillRect(Math.round(p.x), Math.round(p.y), p.r, p.r); g.globalAlpha = 1; }
function drawWave(w) { g.globalAlpha = clamp(w.life / w.max, 0, 1); g.strokeStyle = w.color; g.strokeRect(Math.round(w.x - w.r), Math.round(w.y - w.r / 2), Math.round(w.r * 2), Math.round(w.r)); g.globalAlpha = 1; }
function drawBolt(b) { g.globalAlpha = b.life / b.max; g.strokeStyle = C.cyan; g.beginPath(); g.moveTo(Math.round(b.x1), Math.round(b.y1)); const mx = (b.x1 + b.x2) / 2 + (Math.random() < 0.5 ? -2 : 2); const my = (b.y1 + b.y2) / 2 + (Math.random() < 0.5 ? -2 : 2); g.lineTo(Math.round(mx), Math.round(my)); g.lineTo(Math.round(b.x2), Math.round(b.y2)); g.stroke(); g.globalAlpha = 1; }
function drawFloater(f) { g.globalAlpha = clamp(f.life / f.max, 0, 1); g.fillStyle = f.color; g.font = 'bold 5px monospace'; g.textAlign = 'center'; g.fillText(f.text, Math.round(f.x), Math.round(f.y)); g.globalAlpha = 1; }

function drawVeil() {
  if (room?.mod.id !== 'veil' || !player) return;
  g.save(); g.fillStyle = 'rgba(4,4,12,.82)'; g.beginPath(); g.rect(0, 0, W, H); g.arc(player.x, player.y, 54, 0, TAU, true); g.fill('evenodd'); g.restore();
}

function drawHud() {
  if (!player || state === 'menu') return;
  g.fillStyle = '#101018'; g.fillRect(3, 3, 103, 29); g.fillStyle = '#403038'; g.fillRect(7, 9, 66, 4); g.fillStyle = C.red; g.fillRect(7, 9, Math.floor(66 * clamp(player.hp / player.maxHp, 0, 1)), 4);
  g.fillStyle = C.ink; g.font = 'bold 5px monospace'; g.textAlign = 'left'; g.fillText(`${Math.ceil(player.hp)}/${player.maxHp}`, 7, 7); g.fillStyle = WEAPONS[player.weapon].color; g.fillText(`${WEAPONS[player.weapon].short} R${player.weaponRanks[player.weapon]}`, 7, 20);
  g.fillStyle = '#183038'; g.fillRect(7, 24, 66, 3); g.fillStyle = player.nova >= 100 ? C.white : C.cyan; g.fillRect(7, 24, Math.floor(66 * player.nova / 100), 3); g.fillStyle = C.pale; g.fillText(player.nova >= 100 ? 'NOVA READY' : `NOVA ${Math.floor(player.nova)}%`, 76, 27);
  g.textAlign = 'right'; g.fillStyle = C.ink; g.fillText(`CH ${roomNo}/10`, W - 5, 8); g.fillStyle = PALETTES[room?.theme || 0].accent; g.fillText(room?.mod.name || '', W - 5, 15); g.fillStyle = C.gold; g.fillText(score.toLocaleString(), W - 5, 23);
  if (combo > 1) { g.fillStyle = C.gold; g.font = 'bold 8px monospace'; g.fillText(`x${comboMultiplier.toFixed(2)}`, W - 5, 34); g.font = 'bold 5px monospace'; g.fillText(`${combo} COMBO`, W - 5, 40); }
  g.textAlign = 'left'; g.fillStyle = bountyComplete ? C.green : C.pale; g.font = 'bold 5px monospace'; g.fillText(`BOUNTY: ${currentBounty?.name || ''}`, 5, H - 11); g.fillText(bountyComplete ? 'COMPLETE' : `${Math.min(bountyProgress, currentBounty?.target || 0)}/${currentBounty?.target || 0}`, 5, H - 5);
  const ready = clamp((elapsed - player.dashAt) / player.dashCd, 0, 1); g.fillStyle = '#303040'; g.fillRect(88, H - 7, 37, 3); g.fillStyle = C.pale; g.fillRect(88, H - 7, Math.floor(37 * ready), 3); g.fillText('DASH', 88, H - 10);
  g.fillStyle = '#202030'; g.fillRect(132, H - 10, 62, 7); let ix = 134; for (const id of Object.keys(WEAPONS)) { g.fillStyle = player.arsenal[id] ? WEAPONS[id].color : '#383848'; g.fillRect(ix, H - 8, 14, 3); if (id === player.weapon) { g.fillStyle = C.white; g.fillRect(ix, H - 10, 14, 1); } ix += 19; }
}

function drawTouchControls() {
  g.globalAlpha = 0.45; g.strokeStyle = C.white; const lx = touch.left?.startX || 29; const ly = touch.left?.startY || H - 29; g.strokeRect(lx - 13, ly - 13, 26, 26); if (touch.left) g.strokeRect(touch.left.x - 5, touch.left.y - 5, 10, 10);
  g.strokeRect(W - 26, H - 26, 18, 18); g.strokeRect(W - 52, H - 26, 18, 18); g.strokeRect(W - 78, H - 26, 18, 18); g.fillStyle = C.white; g.font = 'bold 4px monospace'; g.textAlign = 'center'; g.fillText('DASH', W - 17, H - 16); g.fillText('NOVA', W - 43, H - 16); g.fillText('SWAP', W - 69, H - 16); g.globalAlpha = 1;
}

function drawPost() {
  g.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
  if (flash > 0) { g.fillStyle = `rgba(255,80,70,${flash * 0.45})`; g.fillRect(0, 0, W, H); }
  g.strokeStyle = '#080810'; g.lineWidth = 4; g.strokeRect(1, 1, W - 2, H - 2);
}

function armory() {
  const items = [['ironHeart', 'IRON HEART', '+10 starting vitality', 12], ['edge', 'HONED EDGE', '+2 starting damage', 14], ['boots', 'WAYFARER BOOTS', '+3 movement speed', 10]];
  $('#armory').innerHTML = `<p class="eyebrow">PERMANENT ARMORY</p><h2>SPEND EMBERS</h2><p>AVAILABLE: <strong>${meta.embers}</strong></p>${items.map(([key, name, desc, base]) => { const rank = meta.unlocks[key]; const cost = base * (rank + 1); return `<div class="shop-row"><span><strong>${name} ${rank}/5</strong><br><small>${desc}</small></span><button data-buy="${key}" ${rank >= 5 ? 'disabled' : ''}>${rank >= 5 ? 'MAX' : cost + ' EMBERS'}</button></div>`; }).join('')}<button id="armoryBack" class="secondary">BACK</button>`;
  show('armory'); document.querySelectorAll('[data-buy]').forEach((button) => button.onclick = () => { const key = button.dataset.buy; const base = { ironHeart: 12, edge: 14, boots: 10 }[key]; const cost = base * (meta.unlocks[key] + 1); if (meta.embers >= cost && meta.unlocks[key] < 5) { meta.embers -= cost; meta.unlocks[key]++; saveMeta(); armory(); } else toast('NOT ENOUGH EMBERS'); }); $('#armoryBack').onclick = () => show('menu');
}

function scoresPanel() {
  const rows = meta.scores.length ? meta.scores.map((s, i) => `<div class="score-row"><span>#${i + 1} ${s.win ? 'ESCAPE' : 'ROOM ' + s.rooms}</span><strong>${s.score.toLocaleString()}</strong></div>`).join('') : '<p class="fine">NO RUNS RECORDED.</p>';
  const ach = Object.values(meta.achievements).filter(Boolean).length;
  $('#scores').innerHTML = `<p class="eyebrow">HALL OF RECORDS</p><h2>BEST RUNS</h2><p>ACHIEVEMENTS ${ach}/4</p>${rows}<button id="scoresBack" class="secondary">BACK</button>`; show('scores'); $('#scoresBack').onclick = () => show('menu');
}

function togglePause() { if (state !== 'playing' && state !== 'pause') return; paused = !paused; if (paused) { state = 'pause'; $('#pause').classList.add('visible'); } else { state = 'playing'; $('#pause').classList.remove('visible'); } }
function canvasPoint(clientX, clientY) { const rect = canvas.getBoundingClientRect(); return { x: (clientX - rect.left) / rect.width * W, y: (clientY - rect.top) / rect.height * H }; }
function handleTouchStart(event) {
  event.preventDefault(); touch.active = true;
  for (const t of event.changedTouches) { const p = canvasPoint(t.clientX, t.clientY); if (Math.hypot(p.x - (W - 17), p.y - (H - 17)) < 12) { dash(0, 0); continue; } if (Math.hypot(p.x - (W - 43), p.y - (H - 17)) < 12) { activateNova(); continue; } if (Math.hypot(p.x - (W - 69), p.y - (H - 17)) < 12) { cycleWeapon(); continue; } if (p.x < W * 0.45 && !touch.left) touch.left = { id: t.identifier, startX: p.x, startY: p.y, x: p.x, y: p.y }; else if (!touch.right) touch.right = { id: t.identifier, startX: p.x, startY: p.y, x: p.x, y: p.y }; }
}
function handleTouchMove(event) { event.preventDefault(); for (const t of event.changedTouches) { const p = canvasPoint(t.clientX, t.clientY); if (touch.left?.id === t.identifier) { touch.left.x = p.x; touch.left.y = p.y; } if (touch.right?.id === t.identifier) { touch.right.x = p.x; touch.right.y = p.y; } } }
function handleTouchEnd(event) { event.preventDefault(); for (const t of event.changedTouches) { if (touch.left?.id === t.identifier) touch.left = null; if (touch.right?.id === t.identifier) touch.right = null; } }

function sound(type) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); const now = audioCtx.currentTime;
    const map = { shot: [260, .035, .025, 'square'], scatter: [110, .07, .04, 'square'], arc: [520, .08, .025, 'square'], hurt: [90, .12, .06, 'sawtooth'], kill: [180, .08, .025, 'triangle'], dash: [420, .07, .025, 'square'], nova: [110, .42, .09, 'sawtooth'], pickup: [620, .08, .025, 'square'], explode: [70, .22, .08, 'square'], charge: [160, .14, .04, 'sawtooth'], slam: [55, .28, .08, 'square'], swap: [360, .06, .02, 'square'], bounty: [760, .2, .035, 'square'] };
    const [frequency, duration, volume, wave] = map[type] || map.shot; osc.type = wave; osc.frequency.setValueAtTime(frequency, now); osc.frequency.exponentialRampToValueAtTime(Math.max(35, frequency * .55), now + duration); gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration); osc.connect(gain).connect(audioCtx.destination); osc.start(now); osc.stop(now + duration);
  } catch { }
}

addEventListener('keydown', (event) => { keys[event.code] = true; if (event.code === 'Escape') togglePause(); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault(); });
addEventListener('keyup', (event) => { keys[event.code] = false; });
canvas.addEventListener('mousemove', (event) => { const p = canvasPoint(event.clientX, event.clientY); mouse.x = p.x; mouse.y = p.y; });
canvas.addEventListener('mousedown', () => { mouse.down = true; }); addEventListener('mouseup', () => { mouse.down = false; }); canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('touchstart', handleTouchStart, { passive: false }); canvas.addEventListener('touchmove', handleTouchMove, { passive: false }); canvas.addEventListener('touchend', handleTouchEnd, { passive: false }); canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
$('#startBtn').onclick = resetRun; $('#armoryBtn').onclick = armory; $('#scoresBtn').onclick = scoresPanel; $('#resumeBtn').onclick = togglePause; $('#quitBtn').onclick = () => endRun(false);

function pollGamepadPause() { const gp = navigator.getGamepads?.()[0]; const pressed = !!gp?.buttons[9]?.pressed; if (pressed && !gamepadPause) togglePause(); gamepadPause = pressed; }
function loop(time) { const dt = Math.min(0.033, (time - last) / 1000 || 0); last = time; pollGamepadPause(); update(dt); draw(); requestAnimationFrame(loop); }
updateMeta(); show('menu'); requestAnimationFrame(loop);
