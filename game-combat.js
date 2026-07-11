function update(dt) {
  if (state !== 'playing' || paused) return;
  elapsed += dt;
  player.inv = Math.max(0, player.inv - dt);
  player.dashTime = Math.max(0, player.dashTime - dt);
  comboTimer = Math.max(0, comboTimer - dt);
  if (comboTimer === 0 && combo > 0) { combo = 0; comboMultiplier = 1; }
  input(dt);

  for (const e of enemies) {
    e.hit = Math.max(0, e.hit - dt);
    e.attack -= dt;
    e.summon -= dt;
    e.phase += dt;
    e.contactCooldown = Math.max(0, (e.contactCooldown || 0) - dt);
    const previousContactWindup = e.contactWindup || 0;
    e.contactWindup = Math.max(0, previousContactWindup - dt);
    const previousShotWindup = e.shotWindup || 0;
    e.shotWindup = Math.max(0, previousShotWindup - dt);

    if (e.burn > 0) {
      e.burn -= dt;
      e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick = 0.45;
        damageEnemy(e, 4 + player.baseDamage * 0.08, false, true);
      }
    }

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const melee = e.type === 'stalker' || e.type === 'brute';

    if (melee && previousContactWindup > 0) {
      e.anim = 'attack';
      e.animUntil = Math.max(e.animUntil || 0, elapsed + e.contactWindup);
    } else if (e.type === 'shooter') {
      if (previousShotWindup > 0) {
        if (e.shotWindup <= 0) {
          enemyShoot(e);
          e.attack = 1.35;
        }
      } else if (e.attack <= 0) {
        e.shotWindup = 0.24;
        e.anim = 'shoot';
        e.animUntil = elapsed + 0.3;
      } else {
        if (d > 60) moveEntity(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
        else if (d < 42) moveEntity(e, -dx / d * e.speed * dt, -dy / d * e.speed * dt);
      }
    } else if (e.type === 'charger') {
      updateCharger(e, dx, dy, d, dt);
    } else if (e.type === 'gravebinder') {
      if (previousShotWindup > 0) {
        if (e.shotWindup <= 0) {
          enemyShoot(e, 3, 59);
          e.attack = 2.1;
        }
      } else if (e.attack <= 0) {
        e.shotWindup = 0.36;
        e.anim = 'shoot';
        e.animUntil = elapsed + 0.42;
      } else {
        if (d > 84) moveEntity(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
        else if (d < 58) moveEntity(e, -dx / d * e.speed * dt, -dy / d * e.speed * dt);
      }
      if (e.summon <= 0) { summonShade(e); e.summon = e.elite ? 3.8 : 5.4; }
    } else if (e.type === 'revenant') {
      updateRevenant(e, dx, dy, d, dt);
    } else if (e.type === 'warden') {
      updateWarden(e, dx, dy, d, dt, previousShotWindup);
    } else {
      moveEntity(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
    }

    if (melee) {
      const range = e.r + player.r + (e.type === 'brute' ? 3 : 2);
      if (previousContactWindup > 0 && e.contactWindup <= 0) {
        e.contactCooldown = e.type === 'brute' ? 1.2 : 0.78;
        if (d <= range + 3 && player.inv <= 0) {
          hurtPlayer(Math.max(1, e.damage - player.armor));
          player.inv = 0.65;
          moveEntity(player, dx / d * 7, dy / d * 7);
        }
      } else if (previousContactWindup <= 0 && e.contactCooldown <= 0 && d <= range) {
        e.contactWindup = e.type === 'brute' ? 0.52 : 0.28;
        e.anim = 'attack';
        e.animUntil = elapsed + e.contactWindup + 0.08;
      }
    } else if (d < e.r + player.r + 1 && player.inv <= 0 && e.contactCooldown <= 0) {
      hurtPlayer(Math.max(1, e.damage - player.armor));
      player.inv = 0.65;
      e.contactCooldown = 0.75;
      moveEntity(player, dx / d * 7, dy / d * 7);
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
          if (b.burn && Math.random() < b.burn) {
            e.burn = Math.max(e.burn, 2.6);
            e.burnTick = 0.12;
          }
          if (b.chain) chainLightning(e, damage * (0.46 + player.chainBonus));
          if (b.weapon === 'scatter') {
            const speed = Math.hypot(b.vx, b.vy) || 1;
            moveEntity(e, b.vx / speed * 2.5, b.vy / speed * 2.5);
          }
          b.pierce--;
          if (b.pierce < 0) b.life = 0;
          break;
        }
      }
    }
  }

  bullets = bullets.filter((b) => b.life > 0 && b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10);
  enemies = enemies.filter((e) => e.hp > 0);

  for (const d of drops) {
    if (Math.hypot(d.x - player.x, d.y - player.y) < 9) {
      if (d.type === 'heart') player.hp = Math.min(player.maxHp, player.hp + 18);
      else if (d.type === 'weapon') unlockWeapon(d.weapon);
      else { score += 75; runEmbers += 1; }
      d.dead = true;
      sound('pickup');
    }
  }
  drops = drops.filter((d) => !d.dead);

  hazards.forEach((h) => { h.pulse += dt * 2.4; });
  particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.vx *= 0.95; p.vy *= 0.95; });
  particles = particles.filter((p) => p.life > 0);
  floaters.forEach((f) => { f.y -= 8 * dt; f.life -= dt; });
  floaters = floaters.filter((f) => f.life > 0);
  waves.forEach((w) => { w.r += 130 * dt; w.life -= dt; });
  waves = waves.filter((w) => w.life > 0);
  bolts.forEach((b) => { b.life -= dt; });
  bolts = bolts.filter((b) => b.life > 0);
  shake = Math.max(0, shake - dt * 5);
  flash = Math.max(0, flash - dt * 1.8);

  if (!enemies.length && !room.cleared) {
    room.cleared = true;
    player.hp = Math.min(player.maxHp, player.hp + player.roomHeal);
    if (elapsed - roomStart <= 18) updateBounty('swift', 1);
    setTimeout(roomComplete, 550);
  }
}

function updateCharger(e, dx, dy, d, dt) {
  if (e.charge > 0) {
    e.anim = 'attack';
    e.animUntil = elapsed + e.charge;
    moveEntity(e, e.cvx * dt, e.cvy * dt);
    e.charge -= dt;
    return;
  }
  if (e.telegraph > 0) {
    e.anim = 'attack';
    e.animUntil = elapsed + e.telegraph;
    e.telegraph -= dt;
    if (e.telegraph <= 0) {
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      e.cvx = Math.cos(a) * (e.elite ? 180 : 155);
      e.cvy = Math.sin(a) * (e.elite ? 180 : 155);
      e.charge = 0.48;
      sound('charge');
    }
    return;
  }
  if (e.attack <= 0 && d < 140) {
    e.telegraph = 0.7;
    e.anim = 'attack';
    e.animUntil = elapsed + 0.75;
    e.attack = e.elite ? 1.85 : 2.5;
  } else {
    moveEntity(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
  }
}

function updateRevenant(e, dx, dy, d, dt) {
  if (e.slam > 0) {
    e.anim = 'attack';
    e.animUntil = elapsed + e.slam;
    e.slam -= dt;
    if (e.slam <= 0) {
      enemyShoot(e, 14, 52, true);
      waves.push({ x: e.x, y: e.y, r: 0, life: 0.55, max: 0.55, color: '#a8b8d8' });
      if (d < 28 && player.inv <= 0) hurtPlayer(Math.max(1, e.damage + 8 - player.armor));
      shake = 5;
      sound('slam');
    }
    return;
  }
  moveEntity(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
  if (e.attack <= 0) {
    e.slam = 0.85;
    e.anim = 'attack';
    e.animUntil = elapsed + 0.9;
    e.attack = e.hp < e.maxHp * 0.5 ? 2.3 : 3.2;
  }
}

function updateWarden(e, dx, dy, d, dt, previousShotWindup = 0) {
  if (previousShotWindup > 0) {
    e.anim = 'shoot';
    e.animUntil = elapsed + e.shotWindup;
    if (e.shotWindup <= 0) {
      enemyShoot(e, e.hp < e.maxHp * 0.5 ? 12 : 7, null, e.hp < e.maxHp * 0.5);
      e.attack = e.hp < e.maxHp * 0.5 ? 0.72 : 1.05;
    }
  } else if (e.attack <= 0) {
    e.shotWindup = e.hp < e.maxHp * 0.5 ? 0.16 : 0.24;
    e.anim = 'shoot';
    e.animUntil = elapsed + e.shotWindup + 0.08;
  } else {
    moveEntity(e, dx / d * e.speed * dt, dy / d * e.speed * dt);
  }
  if (e.summon <= 0) {
    spawnMinion(e);
    e.summon = e.hp < e.maxHp * 0.5 ? 3.2 : 4.8;
  }
}

function summonShade(e) {
  if (enemies.length >= 14) return;
  for (let i = 0; i < (e.elite ? 2 : 1); i++) {
    const a = rand(0, TAU);
    const shade = makeEnemy('stalker', e.x + Math.cos(a) * 14, e.y + Math.sin(a) * 14);
    shade.hp *= 0.72;
    shade.maxHp = shade.hp;
    shade.color = '#7050a8';
    shade.value = 70;
    enemies.push(shade);
  }
  burst(e.x, e.y, '#a078e8', 14, 55);
  toast('SHADES RISE');
}

function spawnMinion(e) {
  if (enemies.length < 10) {
    const a = rand(0, TAU);
    enemies.push(makeEnemy(Math.random() < 0.4 ? 'charger' : 'stalker', e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20));
  }
}

function chainLightning(source, amount) {
  const candidates = enemies
    .filter((e) => e !== source && e.hp > 0 && Math.hypot(e.x - source.x, e.y - source.y) < 38)
    .sort((a, b) => dist(a, source) - dist(b, source));
  const target = candidates[0];
  if (!target) return;
  bolts.push({ x1: source.x, y1: source.y, x2: target.x, y2: target.y, life: 0.12, max: 0.12 });
  damageEnemy(target, amount, false, true);
}

function damageEnemy(e, amount, crit = false, passive = false) {
  let remaining = amount;
  if (e.shield > 0) {
    const absorbed = Math.min(e.shield, remaining);
    e.shield -= absorbed;
    remaining -= absorbed;
    burst(e.x, e.y, C.cyan, 4, 40);
  }
  if (remaining > 0) e.hp -= remaining;
  e.hit = 0.09;
  if (e.hp > 0) {
    e.anim = 'hurt';
    e.animUntil = elapsed + 0.12;
  }
  if (!passive) score += Math.round(amount * 0.35);
  floaters.push({ x: e.x, y: e.y - e.r, text: `${crit ? '!' : ''}${Math.round(amount)}`, color: crit ? C.white : C.gold, life: 0.62, max: 0.62 });
  if (e.hp <= 0) killEnemy(e);
}

function explodeHazard(h) {
  if (h.dead) return;
  h.dead = true;
  shake = Math.max(shake, 3);
  waves.push({ x: h.x, y: h.y, r: 0, life: 0.38, max: 0.38, color: C.orange });
  burst(h.x, h.y, C.orange, 18, 90);
  for (const e of enemies) {
    const d = Math.hypot(e.x - h.x, e.y - h.y);
    if (d < 31) damageEnemy(e, 58 * (1 - d / 45));
  }
  if (Math.hypot(player.x - h.x, player.y - h.y) < 23 && player.inv <= 0) hurtPlayer(10);
  if (Math.random() < 0.3) drops.push({ x: h.x, y: h.y, type: Math.random() < 0.45 ? 'heart' : 'coin' });
  sound('explode');
}

function hurtPlayer(amount) {
  player.anim = 'hurt';
  player.animUntil = elapsed + 0.25;
  player.hp -= amount;
  shake = 3;
  flash = 0.32;
  combo = 0;
  comboTimer = 0;
  comboMultiplier = 1;
  burst(player.x, player.y, '#f05048', 12, 80);
  floaters.push({ x: player.x, y: player.y - 7, text: `-${Math.round(amount)}`, color: '#ff7068', life: 0.8, max: 0.8 });
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
  player.nova = Math.min(100, player.nova + (e.elite ? 32 : e.type === 'warden' ? 100 : 15));
  if (combo >= 10) updateBounty('combo', combo);
  if (e.elite) { eliteKills++; updateBounty('elite', eliteKills); }
  if (e.type === 'revenant') {
    meta.achievements.revenant = true;
    runEmbers += 8;
    saveMeta();
    toast('IRON REVENANT BROKEN');
  }
  if (!meta.achievements.firstBlood) {
    meta.achievements.firstBlood = true;
    saveMeta();
  }
  shake = Math.min(4, shake + (e.elite ? 2 : 0.5));
  burst(e.x, e.y, e.color, e.elite ? 22 : 12, e.elite ? 100 : 65);
  if (player.lifesteal) player.hp = Math.min(player.maxHp, player.hp + player.lifesteal);
  if (Math.random() < 0.12) drops.push({ x: e.x, y: e.y, type: 'heart' });
  else if (Math.random() < 0.2 || e.elite) drops.push({ x: e.x, y: e.y, type: 'coin' });
  if (e.elite && Math.random() < 0.38) {
    const locked = Object.keys(WEAPONS).filter((id) => !player.arsenal[id]);
    if (locked.length) drops.push({ x: e.x + 4, y: e.y, type: 'weapon', weapon: pick(locked) });
  }
  sound('kill');
}

function unlockWeapon(id) {
  if (!id) return;
  if (!player.arsenal[id]) {
    player.arsenal[id] = true;
    player.weapon = id;
    toast(`${WEAPONS[id].name} ACQUIRED`);
  } else {
    player.weaponRanks[id]++;
    toast(`${WEAPONS[id].name} RANK ${player.weaponRanks[id]}`);
  }
  if (player.arsenal.pistol && player.arsenal.scatter && player.arsenal.arc) {
    meta.achievements.arsenal = true;
    saveMeta();
  }
}

function updateBounty(id, value) {
  if (!currentBounty || currentBounty.id !== id || bountyComplete) return;
  bountyProgress = Math.max(bountyProgress, value);
  if (bountyProgress >= currentBounty.target) {
    bountyComplete = true;
    toast('BOUNTY COMPLETE · +25 EMBERS');
    sound('bounty');
  }
}

function roomComplete() {
  if (state !== 'playing') return;
  if (roomNo === 10) { endRun(true); return; }
  const continueFlow = () => showRelicChoice();
  if (roomNo === 3 || roomNo === 7) showTreasure(continueFlow);
  else continueFlow();
}

function showTreasure(after) {
  pendingAfterTreasure = after;
  state = 'treasure';
  const locked = Object.keys(WEAPONS).filter((id) => !player.arsenal[id]);
  const armText = locked.length ? `Unlock ${WEAPONS[locked[0]].name}` : `Upgrade ${WEAPONS[player.weapon].name}`;
  $('#treasure').innerHTML = `<p class="eyebrow">SECRET VAULT</p><h2>CHOOSE ONE CHEST</h2><div class="cards"><button class="card" data-chest="arm"><span class="tag">ARMAMENT</span><h3>IRON CACHE</h3><p>${armText}</p></button><button class="card" data-chest="vital"><span class="tag">VITALITY</span><h3>CRIMSON FLASK</h3><p>+15 max vitality and heal fully.</p></button><button class="card" data-chest="ember"><span class="tag">FORTUNE</span><h3>EMBER COFFER</h3><p>Recover 18 bonus Embers.</p></button></div>`;
  show('treasure');
  document.querySelectorAll('[data-chest]').forEach((button) => button.onclick = () => {
    const choice = button.dataset.chest;
    if (choice === 'arm') {
      const remaining = Object.keys(WEAPONS).filter((id) => !player.arsenal[id]);
      unlockWeapon(remaining[0] || player.weapon);
    }
    if (choice === 'vital') {
      player.maxHp += 15;
      player.hp = player.maxHp;
      toast('VITALITY RESTORED');
    }
    if (choice === 'ember') {
      runEmbers += 18;
      toast('+18 EMBERS BANKED');
    }
    $('#treasure').classList.remove('visible');
    state = 'playing';
    const callback = pendingAfterTreasure;
    pendingAfterTreasure = null;
    callback?.();
  });
}

function showRelicChoice() {
  const choices = pickUpgrades(3);
  $('#choice').innerHTML = `<p class="eyebrow">CHAMBER CLEARED</p><h2>CHOOSE A RELIC</h2><div class="cards">${choices.map((u, i) => `<button class="card" data-up="${i}"><span class="tag">${u.rarity}</span><h3>${u.name}</h3><p>${u.desc}</p></button>`).join('')}</div>`;
  show('choice');
  state = 'choice';
  document.querySelectorAll('[data-up]').forEach((button) => button.onclick = () => {
    choices[+button.dataset.up].apply();
    $('#choice').classList.remove('visible');
    state = 'playing';
    nextRoom();
  });
}

const upgrades = [
  { name: 'TEMPERED EDGE', rarity: 'COMMON', desc: '+25% weapon damage.', apply() { player.baseDamage *= 1.25; } },
  { name: 'QUICKLOCK', rarity: 'COMMON', desc: 'All weapons fire 12% faster.', apply() { player.fireRateMod *= 0.88; } },
  { name: 'GHOST NAIL', rarity: 'RARE', desc: 'Projectiles pierce one additional foe.', apply() { player.pierce++; } },
  { name: 'BLACKGLASS HEART', rarity: 'RARE', desc: '+30 max vitality and heal fully.', apply() { player.maxHp += 30; player.hp = player.maxHp; } },
  { name: 'WARDEN PLATE', rarity: 'RARE', desc: 'Reduce incoming damage by 4.', apply() { player.armor += 4; } },
  { name: 'BLOOD CHALICE', rarity: 'RARE', desc: 'Heal 3 vitality on every kill.', apply() { player.lifesteal += 3; } },
  { name: 'SPLIT SIGIL', rarity: 'RARE', desc: 'Cinder Pistol fires one extra shot.', apply() { player.multishot = Math.min(4, player.multishot + 1); } },
  { name: 'EMBER BRAND', rarity: 'LEGENDARY', desc: 'Burn chance increases by 30%.', apply() { player.burnBonus += 0.3; } },
  { name: 'STORM LINK', rarity: 'LEGENDARY', desc: 'Chain lightning deals 30% more damage.', apply() { player.chainBonus += 0.3; } },
  { name: 'EXECUTION MARK', rarity: 'LEGENDARY', desc: '+15% critical chance.', apply() { player.crit += 0.15; } },
  { name: 'ASHEN RENEWAL', rarity: 'LEGENDARY', desc: 'Heal 10 vitality after every chamber.', apply() { player.roomHeal += 10; } },
  { name: 'NOVA CONDUIT', rarity: 'LEGENDARY', desc: 'Immediately gain 45% Nova charge.', apply() { player.nova = Math.min(100, player.nova + 45); } }
];

function pickUpgrades(n) {
  return [...upgrades].sort(() => Math.random() - 0.5).slice(0, n);
}

function endRun(win) {
  if (state === 'summary') return;
  state = 'summary';
  paused = false;
  if (win) {
    meta.wins++;
    meta.achievements.warden = true;
  }
  const bountyReward = bountyComplete ? 25 : 0;
  const earned = Math.floor(roomNo * 3 + kills * 0.5 + (win ? 35 : 0) + runEmbers + bountyReward);
  meta.embers += earned;
  meta.runs++;
  meta.best = Math.max(meta.best, score);
  meta.scores.push({ score, rooms: roomNo, time: Math.floor(elapsed), win, date: new Date().toLocaleDateString() });
  meta.scores.sort((a, b) => b.score - a.score);
  meta.scores = meta.scores.slice(0, 10);
  saveMeta();
  $('#summary').innerHTML = `<p class="eyebrow">${win ? 'VAULT CONQUERED' : 'THE VAULT CLAIMS ANOTHER'}</p><h2>${win ? 'THE WARDEN FALLS' : 'RUN ENDED'}</h2><div class="score-row"><span>SCORE</span><strong>${score.toLocaleString()}</strong></div><div class="score-row"><span>CHAMBERS</span><strong>${roomNo}/10</strong></div><div class="score-row"><span>ENEMIES</span><strong>${kills}</strong></div><div class="score-row"><span>BOUNTY</span><strong>${bountyComplete ? '+25' : 'FAILED'}</strong></div><div class="score-row"><span>EMBERS</span><strong>${earned}</strong></div><button id="again">RUN AGAIN</button><button id="home" class="secondary">RETURN TO VAULT</button>`;
  show('summary');
  $('#again').onclick = resetRun;
  $('#home').onclick = () => { show('menu'); updateMeta(); };
}

function burst(x, y, color, count, maxSpeed = 55) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU);
    const speed = rand(8, maxSpeed);
    particles.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: rand(0.2, 0.65),
      max: 0.65,
      color,
      r: Math.random() < 0.5 ? 1 : 2
    });
  }
}
