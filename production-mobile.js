'use strict';

(() => {
  const coarsePointer = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const qaEnabled = new URLSearchParams(location.search).get('qa') === '1';
  let portraitOverride = false;
  let fps = 60;
  let fpsFrames = 0;
  let fpsStamp = performance.now();

  function vibrate(ms = 18) {
    try { navigator.vibrate?.(ms); } catch { }
  }

  function syncViewport() {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty('--viewport-height', `${viewportHeight}px`);
    const mobile = coarsePointer();
    const portrait = mobile && window.innerHeight > window.innerWidth;
    document.body.classList.toggle('mobile-device', mobile);
    document.body.classList.toggle('portrait-mobile', portrait && !portraitOverride);
    if (!portrait) portraitOverride = false;
  }

  async function enterImmersiveMode() {
    if (!coarsePointer()) return;
    try {
      const target = document.querySelector('#app');
      if (!document.fullscreenElement && target?.requestFullscreen) await target.requestFullscreen({ navigationUI: 'hide' });
    } catch { }
    try { await window.screen?.orientation?.lock?.('landscape'); } catch { }
  }

  $('#rotateAnywayBtn')?.addEventListener('click', () => {
    portraitOverride = true;
    document.body.classList.remove('portrait-mobile');
  });

  window.addEventListener('resize', syncViewport, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(syncViewport, 120), { passive: true });
  window.visualViewport?.addEventListener('resize', syncViewport, { passive: true });
  syncViewport();

  ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
    document.addEventListener(type, (event) => event.preventDefault(), { passive: false });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing' && !paused) togglePause();
  });

  window.addEventListener('pagehide', () => {
    if (state === 'playing' && !paused) togglePause();
  });

  const originalResetRun = resetRun;
  resetRun = function productionResetRun() {
    originalResetRun();
    player.anim = 'idle';
    player.animUntil = 0;
    player.lastAim = player.aim;
  };

  const originalMakeEnemy = makeEnemy;
  makeEnemy = function productionMakeEnemy(...args) {
    const enemy = originalMakeEnemy(...args);
    enemy.anim = 'idle';
    enemy.animUntil = 0;
    enemy.contactCooldown = 0;
    enemy.contactWindup = 0;
    enemy.shotWindup = 0;
    return enemy;
  };

  const originalDash = dash;
  dash = function productionDash(...args) {
    const before = player?.dashAt;
    const result = originalDash(...args);
    if (player && player.dashAt !== before) {
      player.anim = 'dash';
      player.animUntil = elapsed + 0.2;
      vibrate(12);
    }
    return result;
  };

  const originalShoot = shoot;
  shoot = function productionShoot(...args) {
    const before = player?.lastShot;
    const result = originalShoot(...args);
    if (player && player.lastShot !== before) {
      player.anim = 'shoot';
      player.animUntil = elapsed + (player.weapon === 'scatter' ? 0.18 : 0.12);
    }
    return result;
  };

  const originalActivateNova = activateNova;
  activateNova = function productionNova(...args) {
    const before = player?.nova;
    const result = originalActivateNova(...args);
    if (player && before >= 100 && player.nova === 0) {
      player.anim = 'dash';
      player.animUntil = elapsed + 0.28;
      vibrate(35);
    }
    return result;
  };

  const originalEnemyShoot = enemyShoot;
  enemyShoot = function productionEnemyShoot(enemy, ...args) {
    if (enemy) {
      enemy.anim = 'shoot';
      enemy.animUntil = elapsed + (enemy.type === 'warden' ? 0.18 : 0.28);
    }
    return originalEnemyShoot(enemy, ...args);
  };

  const originalDamageEnemy = damageEnemy;
  damageEnemy = function productionDamageEnemy(enemy, ...args) {
    const result = originalDamageEnemy(enemy, ...args);
    if (enemy?.hp > 0) {
      enemy.anim = 'hurt';
      enemy.animUntil = elapsed + 0.12;
    }
    return result;
  };

  const originalHurtPlayer = hurtPlayer;
  hurtPlayer = function productionHurtPlayer(...args) {
    if (player) {
      player.anim = 'hurt';
      player.animUntil = elapsed + 0.25;
      vibrate(28);
    }
    return originalHurtPlayer(...args);
  };

  function scaleSprite(source, scale) {
    const output = document.createElement('canvas');
    output.width = Math.round(source.width * scale);
    output.height = Math.round(source.height * scale);
    const context = output.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.drawImage(source, 0, 0, output.width, output.height);
    return output;
  }

  if (!PixelArt.sprites.__productionScaled) {
    PixelArt.sprites.revenant.idle = PixelArt.sprites.revenant.idle.map((sprite) => scaleSprite(sprite, 1.16));
    PixelArt.sprites.warden.idle = PixelArt.sprites.warden.idle.map((sprite) => scaleSprite(sprite, 1.13));
    PixelArt.sprites.__productionScaled = true;
  }

  enemyAction = function productionEnemyAction(enemy) {
    if (enemy.animUntil > elapsed && enemy.anim) return enemy.anim;
    if (enemy.type === 'shooter') return 'walk';
    if (enemy.type === 'stalker' || enemy.type === 'brute') return 'walk';
    return 'idle';
  };

  drawPlayer = function productionDrawPlayer() {
    if (!player) return;
    if (player.inv > 0 && Math.floor(elapsed * 20) % 2) return;
    const direction = PixelArt.direction(player.aim);
    let action = isPlayerMoving() ? 'walk' : 'idle';
    if (player.animUntil > elapsed && player.anim) action = player.anim;
    const rate = action === 'walk' ? 8 : action === 'shoot' ? 12 : 6;
    const frame = Math.floor(elapsed * rate) % 2;
    const sprite = PixelArt.spriteFor('player', action, direction, frame);
    PixelArt.draw(g, sprite, player.x, player.y, { anchorY: sprite.height - 1 });
  };

  drawEnemy = function productionDrawEnemy(enemy) {
    const x = Math.round(enemy.x);
    const y = Math.round(enemy.y);

    if (enemy.type === 'charger' && enemy.telegraph > 0) {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      g.strokeStyle = Math.floor(elapsed * 18) % 2 ? PixelArt.P.red2 : PixelArt.P.red0;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(angle) * 105, y + Math.sin(angle) * 105);
      g.stroke();
    }

    if (enemy.contactWindup > 0) {
      const range = enemy.type === 'brute' ? 13 : 10;
      g.strokeStyle = Math.floor(elapsed * 16) % 2 ? PixelArt.P.orange : PixelArt.P.red2;
      g.strokeRect(x - range, y - range, range * 2, range * 2);
    }

    if ((enemy.type === 'revenant' && enemy.slam > 0) || (enemy.type === 'warden' && enemy.anim === 'shoot' && enemy.animUntil > elapsed)) {
      g.strokeStyle = PixelArt.P.gold2;
      g.strokeRect(x - enemy.r - 4, y - enemy.r - 4, enemy.r * 2 + 8, enemy.r * 2 + 8);
    }

    if (enemy.elite && enemy.maxShield > 0) {
      g.strokeStyle = PixelArt.P.cyan2;
      g.strokeRect(x - enemy.r - 2, y - enemy.r - 2, enemy.r * 2 + 4, enemy.r * 2 + 4);
    }

    const frame = Math.floor(elapsed * 7 + enemy.phase * 2) % 2;
    const direction = enemyDirection(enemy);
    const action = enemyAction(enemy);
    const sprite = ['stalker', 'brute', 'shooter'].includes(enemy.type)
      ? PixelArt.spriteFor(enemy.type, action, direction, frame)
      : PixelArt.spriteFor(enemy.type, 'idle', 'down', frame);

    g.save();
    if (enemy.hit > 0 && Math.floor(elapsed * 30) % 2) g.globalAlpha = 0.42;
    PixelArt.draw(g, sprite, x, y, { anchorY: sprite.height - 1 });
    g.restore();

    if (enemy.burn > 0) {
      const flameY = y - enemy.r - 5;
      g.fillStyle = Math.floor(elapsed * 12) % 2 ? PixelArt.P.gold2 : PixelArt.P.red2;
      g.fillRect(x - 2, flameY, 2, 3);
      g.fillStyle = PixelArt.P.orange;
      g.fillRect(x + 1, flameY + 1, 2, 2);
    }

    if (enemy.hp < enemy.maxHp || enemy.type === 'revenant' || enemy.type === 'warden') {
      const width = enemy.type === 'warden' ? 46 : enemy.type === 'revenant' ? 37 : Math.max(11, enemy.r * 2 + 2);
      const barY = y - enemy.r - (enemy.type === 'warden' ? 11 : 8);
      g.fillStyle = PixelArt.P.red0;
      g.fillRect(x - Math.floor(width / 2), barY, width, 3);
      g.fillStyle = PixelArt.P.red2;
      g.fillRect(x - Math.floor(width / 2) + 1, barY + 1, Math.floor((width - 2) * clamp(enemy.hp / enemy.maxHp, 0, 1)), 1);
      if (enemy.shield > 0) {
        g.fillStyle = PixelArt.P.cyan1;
        g.fillRect(x - Math.floor(width / 2), barY - 3, Math.floor(width * clamp(enemy.shield / enemy.maxShield, 0, 1)), 2);
      }
    }
  };

  const touchLayout = {
    joystick: { x: 36, y: H - 35, radius: 23 },
    dash: { x: W - 18, y: H - 22, radius: 14 },
    nova: { x: W - 18, y: H - 54, radius: 14 },
    swap: { x: W - 18, y: H - 86, radius: 14 }
  };

  function pointFromTouch(item) {
    return canvasPoint(item.clientX, item.clientY);
  }

  function actionAt(point) {
    for (const name of ['dash', 'nova', 'swap']) {
      const button = touchLayout[name];
      if (Math.hypot(point.x - button.x, point.y - button.y) <= button.radius + 3) return name;
    }
    return null;
  }

  function mobileTouchStart(event) {
    event.preventDefault();
    touch.active = true;
    for (const item of event.changedTouches) {
      const point = pointFromTouch(item);
      const action = actionAt(point);
      if (action === 'dash') { dash(0, 0); continue; }
      if (action === 'nova') { activateNova(); continue; }
      if (action === 'swap') { cycleWeapon(); vibrate(10); continue; }
      if (point.x < W * 0.44 && !touch.left) {
        touch.left = { id: item.identifier, startX: point.x, startY: point.y, x: point.x, y: point.y };
      } else if (!touch.right) {
        touch.right = { id: item.identifier, startX: point.x, startY: point.y, x: point.x, y: point.y };
      }
    }
  }

  function mobileTouchMove(event) {
    event.preventDefault();
    for (const item of event.changedTouches) {
      const point = pointFromTouch(item);
      if (touch.left?.id === item.identifier) {
        const dx = point.x - touch.left.startX;
        const dy = point.y - touch.left.startY;
        const length = Math.hypot(dx, dy) || 1;
        const limit = 20;
        const scale = Math.min(1, limit / length);
        touch.left.x = touch.left.startX + dx * scale;
        touch.left.y = touch.left.startY + dy * scale;
      }
      if (touch.right?.id === item.identifier) {
        touch.right.x = point.x;
        touch.right.y = point.y;
      }
    }
  }

  function mobileTouchEnd(event) {
    event.preventDefault();
    for (const item of event.changedTouches) {
      if (touch.left?.id === item.identifier) touch.left = null;
      if (touch.right?.id === item.identifier) touch.right = null;
    }
  }

  canvas.removeEventListener('touchstart', handleTouchStart);
  canvas.removeEventListener('touchmove', handleTouchMove);
  canvas.removeEventListener('touchend', handleTouchEnd);
  canvas.removeEventListener('touchcancel', handleTouchEnd);
  canvas.addEventListener('touchstart', mobileTouchStart, { passive: false });
  canvas.addEventListener('touchmove', mobileTouchMove, { passive: false });
  canvas.addEventListener('touchend', mobileTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', mobileTouchEnd, { passive: false });

  drawTouchControls = function productionTouchControls() {
    if (!coarsePointer() && !touch.active) return;
    g.save();
    g.globalAlpha = 0.58;
    g.strokeStyle = PixelArt.P.pale;
    g.fillStyle = 'rgba(8,8,16,.38)';

    const joyX = touch.left?.startX ?? touchLayout.joystick.x;
    const joyY = touch.left?.startY ?? touchLayout.joystick.y;
    g.fillRect(joyX - 22, joyY - 22, 44, 44);
    g.strokeRect(joyX - 22, joyY - 22, 44, 44);
    g.strokeRect(joyX - 12, joyY - 12, 24, 24);
    if (touch.left) {
      g.fillStyle = PixelArt.P.gold0;
      g.fillRect(Math.round(touch.left.x - 6), Math.round(touch.left.y - 6), 12, 12);
      g.strokeRect(Math.round(touch.left.x - 7), Math.round(touch.left.y - 7), 14, 14);
    }

    if (touch.right) {
      g.strokeRect(Math.round(touch.right.startX - 15), Math.round(touch.right.startY - 15), 30, 30);
      g.beginPath();
      g.moveTo(Math.round(touch.right.startX), Math.round(touch.right.startY));
      g.lineTo(Math.round(touch.right.x), Math.round(touch.right.y));
      g.stroke();
    }

    g.font = 'bold 4px monospace';
    g.textAlign = 'center';
    for (const [name, label] of [['dash', 'DASH'], ['nova', 'NOVA'], ['swap', 'SWAP']]) {
      const button = touchLayout[name];
      g.fillStyle = name === 'nova' && player?.nova >= 100 ? 'rgba(88,200,216,.58)' : 'rgba(8,8,16,.48)';
      g.fillRect(button.x - 13, button.y - 13, 26, 26);
      g.strokeStyle = name === 'nova' && player?.nova >= 100 ? PixelArt.P.cyan2 : PixelArt.P.pale;
      g.strokeRect(button.x - 13, button.y - 13, 26, 26);
      g.fillStyle = PixelArt.P.pale;
      g.fillText(label, button.x, button.y + 2);
    }
    g.restore();
  };

  function drawQAOverlay() {
    if (!qaEnabled || !player) return;
    g.save();
    g.strokeStyle = '#54ff75';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(Math.round(player.x), Math.round(player.y), player.r, 0, TAU);
    g.stroke();
    g.fillRect(Math.round(player.x - 4), Math.round(player.y), 8, 1);

    g.strokeStyle = '#ff5b70';
    for (const enemy of enemies) {
      g.beginPath();
      g.arc(Math.round(enemy.x), Math.round(enemy.y), enemy.r, 0, TAU);
      g.stroke();
      g.fillRect(Math.round(enemy.x - 3), Math.round(enemy.y), 6, 1);
    }

    g.strokeStyle = '#5ac8ff';
    room?.obs.forEach((obstacle) => g.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h));
    g.fillStyle = 'rgba(0,0,0,.78)';
    g.fillRect(123, 3, 78, 24);
    g.fillStyle = '#ffffff';
    g.font = 'bold 5px monospace';
    g.textAlign = 'left';
    g.fillText(`QA  FPS ${fps}`, 126, 9);
    g.fillText(`E ${enemies.length} B ${bullets.length}`, 126, 15);
    g.fillText(`XY ${Math.round(player.x)},${Math.round(player.y)}`, 126, 21);
    g.restore();
  }

  draw = function productionDraw() {
    fpsFrames++;
    const now = performance.now();
    if (now - fpsStamp >= 500) {
      fps = Math.round(fpsFrames * 1000 / (now - fpsStamp));
      fpsFrames = 0;
      fpsStamp = now;
    }

    g.clearRect(0, 0, W, H);
    g.save();
    const shakeX = shake ? Math.round(rand(-shake, shake)) : 0;
    const shakeY = shake ? Math.round(rand(-shake, shake)) : 0;
    g.translate(shakeX, shakeY);
    drawFloor();

    if (room) {
      drawShadows();
      const queue = [];
      room.obs.forEach((obstacle) => queue.push({ y: obstacle.y + obstacle.h, draw: () => drawObs(obstacle) }));
      hazards.filter((hazard) => !hazard.dead).forEach((hazard) => queue.push({ y: hazard.y, draw: () => drawHazard(hazard) }));
      drops.forEach((drop) => queue.push({ y: drop.y, draw: () => drawDrop(drop) }));
      bullets.forEach((bullet) => queue.push({ y: bullet.y, draw: () => drawBullet(bullet) }));
      enemies.forEach((enemy) => queue.push({ y: enemy.y, draw: () => drawEnemy(enemy) }));
      if (player) queue.push({ y: player.y, draw: () => drawPlayer() });
      queue.sort((a, b) => a.y - b.y);
      queue.forEach((item) => item.draw());

      particles.forEach(drawParticle);
      waves.forEach(drawWave);
      bolts.forEach(drawBolt);
      floaters.forEach(drawFloater);
      drawVeil();
    }

    g.restore();
    drawHud();
    if (touch.active || coarsePointer()) drawTouchControls();
    drawPost();
    drawQAOverlay();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(screen, 0, 0, canvas.width, canvas.height);
  };

  const startButton = $('#startBtn');
  if (startButton) {
    startButton.onclick = async () => {
      await enterImmersiveMode();
      resetRun();
    };
  }

  const originalEndRun = endRun;
  endRun = function productionEndRun(...args) {
    const result = originalEndRun(...args);
    const again = $('#again');
    if (again) {
      again.onclick = async () => {
        await enterImmersiveMode();
        resetRun();
      };
    }
    return result;
  };

  window.addEventListener('error', (event) => {
    console.error('Ashvault runtime error:', event.error || event.message);
  });
})();