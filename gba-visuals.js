'use strict';

(() => {
  const FE = {
    navy0: '#10152a', navy1: '#1b2850', navy2: '#304a7c', blue: '#4f78b8',
    cream: '#f4e4b8', parchment: '#d8bd82', gold0: '#6f451f', gold1: '#b77a32', gold2: '#f2c25c',
    red0: '#5d1d2b', red1: '#a8363f', red2: '#ef6559', green: '#5d9a65',
    stone0: '#202538', stone1: '#343c55', stone2: '#59627b', shadow: '#080b14'
  };

  function panel(x, y, w, h, title = '') {
    g.fillStyle = FE.shadow;
    g.fillRect(x + 2, y + 2, w, h);
    g.fillStyle = FE.gold0;
    g.fillRect(x, y, w, h);
    g.fillStyle = FE.gold2;
    g.fillRect(x + 1, y + 1, w - 2, 1);
    g.fillStyle = FE.navy0;
    g.fillRect(x + 2, y + 2, w - 4, h - 4);
    g.fillStyle = FE.navy1;
    g.fillRect(x + 3, y + 3, w - 6, h - 6);
    g.fillStyle = FE.navy2;
    g.fillRect(x + 3, y + 3, w - 6, 1);
    g.fillStyle = FE.shadow;
    g.fillRect(x + 3, y + h - 4, w - 6, 1);
    if (title) {
      g.fillStyle = FE.gold1;
      g.fillRect(x + 7, y - 2, Math.min(w - 14, title.length * 5 + 8), 6);
      g.fillStyle = FE.cream;
      g.font = 'bold 4px monospace';
      g.textAlign = 'left';
      g.fillText(title, x + 10, y + 2);
    }
  }

  function portraitCanvas() {
    const c = document.createElement('canvas');
    c.width = 28; c.height = 28;
    const p = c.getContext('2d');
    p.imageSmoothingEnabled = false;
    const px = (color, x, y, w = 1, h = 1) => { p.fillStyle = color; p.fillRect(x, y, w, h); };
    px(FE.shadow, 1, 1, 26, 26);
    px(FE.gold0, 2, 2, 24, 24);
    px(FE.navy0, 3, 3, 22, 22);
    px('#382722', 7, 5, 14, 5);
    px('#805335', 5, 8, 18, 8);
    px('#e9b67c', 7, 8, 14, 12);
    px('#f7d4a1', 8, 9, 12, 8);
    px('#3a2832', 7, 10, 4, 2);
    px('#3a2832', 17, 10, 3, 2);
    px('#6d2c2b', 10, 16, 8, 1);
    px('#5f728d', 5, 19, 18, 5);
    px('#aebfd0', 8, 19, 12, 2);
    px('#d7a33e', 12, 20, 4, 4);
    return c;
  }

  const heroPortrait = portraitCanvas();

  function drawDecorativeFloor() {
    const palette = PALETTES[room?.theme || 0];
    g.fillStyle = room?.theme === 1 ? '#241d2c' : room?.theme === 2 ? '#31251d' : '#1c2433';
    g.fillRect(0, 0, W, H);

    for (let y = 0; y < H; y += 16) {
      for (let x = 0; x < W; x += 16) {
        const alt = ((x / 16 + y / 16 + roomNo) & 1) === 0;
        g.fillStyle = alt ? palette.floor : palette.floor2;
        g.fillRect(x, y, 16, 16);
        g.fillStyle = alt ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.08)';
        g.fillRect(x + 1, y + 1, 14, 1);
        g.fillStyle = 'rgba(0,0,0,.18)';
        g.fillRect(x, y + 15, 16, 1);
        g.fillRect(x + 15, y, 1, 16);
        if (((x * 3 + y * 5 + roomNo) % 7) === 0) {
          g.fillStyle = palette.accent;
          g.globalAlpha = 0.12;
          g.fillRect(x + 7, y + 4, 2, 8);
          g.fillRect(x + 4, y + 7, 8, 2);
          g.globalAlpha = 1;
        }
      }
    }

    const grad = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 190);
    grad.addColorStop(0, 'rgba(255,220,150,.06)');
    grad.addColorStop(1, 'rgba(0,0,0,.34)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }

  const baseDrawFloor = drawFloor;
  drawFloor = function gbaFloor() {
    if (!room) return baseDrawFloor();
    drawDecorativeFloor();
  };

  const baseDrawObs = drawObs;
  drawObs = function gbaObstacle(o) {
    g.fillStyle = FE.shadow;
    g.fillRect(o.x - 1, o.y - 1, o.w + 2, o.h + 3);
    g.fillStyle = FE.stone0;
    g.fillRect(o.x, o.y, o.w, o.h);
    g.fillStyle = FE.stone2;
    g.fillRect(o.x + 1, o.y + 1, o.w - 2, 3);
    g.fillStyle = FE.stone1;
    g.fillRect(o.x + 1, o.y + 4, o.w - 2, Math.max(1, o.h - 6));
    for (let y = o.y + 5; y < o.y + o.h - 2; y += 6) {
      const offset = ((y / 6) & 1) ? 4 : 0;
      g.fillStyle = 'rgba(255,255,255,.07)';
      g.fillRect(o.x + 2 + offset, y, Math.max(3, o.w / 2 - 4), 1);
      g.fillStyle = 'rgba(0,0,0,.2)';
      g.fillRect(o.x + 1, y + 3, o.w - 2, 1);
    }
    g.fillStyle = FE.gold0;
    g.fillRect(o.x + 2, o.y + 2, 2, 2);
    g.fillRect(o.x + o.w - 4, o.y + 2, 2, 2);
  };

  function outlineSprite(sprite, x, y, anchorY) {
    const dx = Math.round(x - sprite.width / 2);
    const dy = Math.round(y - anchorY);
    g.save();
    g.globalAlpha = 0.9;
    g.globalCompositeOperation = 'source-over';
    for (const [ox, oy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      g.drawImage(sprite, dx + ox, dy + oy);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = FE.shadow;
      g.fillRect(dx + ox, dy + oy, sprite.width, sprite.height);
      g.globalCompositeOperation = 'source-over';
    }
    g.restore();
  }

  const baseDrawPlayer = drawPlayer;
  drawPlayer = function gbaPlayer() {
    if (!player) return;
    const dir = PixelArt.direction(player.aim);
    const moving = isPlayerMoving();
    let action = moving ? 'walk' : 'idle';
    if (player.dashTime > 0) action = 'dash';
    else if (elapsed - player.lastShot < 0.12) action = 'shoot';
    else if (player.inv > 0.05 && flash > 0.05) action = 'hurt';
    const frame = Math.floor(elapsed * (action === 'walk' ? 8 : 10)) % 2;
    const sprite = PixelArt.spriteFor('player', action, dir, frame);
    outlineSprite(sprite, player.x, player.y, sprite.height - 1);
    baseDrawPlayer();
    if (player.nova >= 100) {
      g.globalAlpha = 0.45 + Math.sin(elapsed * 8) * 0.15;
      g.strokeStyle = FE.gold2;
      g.strokeRect(Math.round(player.x - 8), Math.round(player.y - 18), 16, 19);
      g.globalAlpha = 1;
    }
  };

  const baseDrawEnemy = drawEnemy;
  drawEnemy = function gbaEnemy(e) {
    let sprite;
    const frame = Math.floor(elapsed * 7 + e.phase * 2) % 2;
    if (['stalker', 'brute', 'shooter'].includes(e.type)) sprite = PixelArt.spriteFor(e.type, enemyAction(e), enemyDirection(e), frame);
    else sprite = PixelArt.spriteFor(e.type, 'idle', 'down', frame);
    outlineSprite(sprite, e.x, e.y, sprite.height - 1);
    baseDrawEnemy(e);
    if (e.elite) {
      g.fillStyle = FE.gold2;
      g.fillRect(Math.round(e.x - 3), Math.round(e.y - sprite.height - 3), 7, 1);
      g.fillRect(Math.round(e.x - 1), Math.round(e.y - sprite.height - 5), 3, 1);
    }
  };

  drawHud = function gbaHud() {
    if (!player || state === 'menu') return;

    panel(3, 3, 126, 35, 'ASHEN KNIGHT');
    g.drawImage(heroPortrait, 6, 6);

    g.fillStyle = FE.red0;
    g.fillRect(38, 9, 72, 7);
    g.fillStyle = FE.red1;
    g.fillRect(39, 10, Math.floor(70 * clamp(player.hp / player.maxHp, 0, 1)), 5);
    g.fillStyle = FE.red2;
    g.fillRect(39, 10, Math.floor(70 * clamp(player.hp / player.maxHp, 0, 1)), 1);
    g.fillStyle = FE.cream;
    g.font = 'bold 5px monospace';
    g.textAlign = 'left';
    g.fillText(`HP ${Math.ceil(player.hp)}/${player.maxHp}`, 38, 22);

    drawWeaponIcon(player.weapon, 38, 24);
    g.fillStyle = WEAPONS[player.weapon].color;
    g.fillText(`${WEAPONS[player.weapon].short} · RANK ${player.weaponRanks[player.weapon]}`, 55, 30);

    g.fillStyle = FE.navy0;
    g.fillRect(38, 32, 72, 3);
    g.fillStyle = player.nova >= 100 ? FE.gold2 : '#6cc9d9';
    g.fillRect(39, 33, Math.floor(70 * player.nova / 100), 1);

    panel(W - 96, 3, 93, 31, 'TACTICAL MAP');
    g.textAlign = 'right';
    g.fillStyle = FE.cream;
    g.fillText(`CHAMBER ${roomNo}/10`, W - 8, 12);
    g.fillStyle = FE.parchment;
    g.fillText(room?.route?.name || room?.mod.name || '', W - 8, 19);
    g.fillStyle = FE.gold2;
    g.fillText(score.toLocaleString().padStart(7, '0'), W - 8, 27);

    if (combo > 1) {
      panel(W - 73, 38, 70, 18, 'COMBO');
      g.fillStyle = FE.gold2;
      g.font = 'bold 8px monospace';
      g.fillText(`x${comboMultiplier.toFixed(2)}`, W - 8, 49);
      g.font = 'bold 5px monospace';
      g.fillStyle = FE.cream;
      g.fillText(`${combo} HITS`, W - 8, 55);
    }

    panel(3, H - 20, 131, 17, 'OBJECTIVE');
    g.textAlign = 'left';
    g.fillStyle = bountyComplete ? FE.green : FE.gold2;
    g.fillText(currentBounty?.name || 'NO BOUNTY', 8, H - 11);
    g.fillStyle = FE.cream;
    g.fillText(bountyComplete ? 'COMPLETE' : `${Math.min(bountyProgress, currentBounty?.target || 0)}/${currentBounty?.target || 0}`, 8, H - 5);

    panel(138, H - 17, 49, 14, 'DASH');
    const ready = clamp((elapsed - player.dashAt) / player.dashCd, 0, 1);
    g.fillStyle = FE.navy0;
    g.fillRect(143, H - 9, 39, 3);
    g.fillStyle = FE.cream;
    g.fillRect(143, H - 9, Math.floor(39 * ready), 3);

    panel(191, H - 18, 73, 15, 'ARSENAL');
    let ix = 195;
    for (const id of Object.keys(WEAPONS)) {
      g.globalAlpha = player.arsenal[id] ? 1 : 0.25;
      drawWeaponIcon(id, ix, H - 15);
      if (id === player.weapon) {
        g.fillStyle = FE.gold2;
        g.fillRect(ix - 1, H - 5, 17, 2);
      }
      g.globalAlpha = 1;
      ix += 24;
    }
  };

  const baseDrawPost = drawPost;
  drawPost = function gbaPost() {
    baseDrawPost();
    g.fillStyle = 'rgba(8,10,22,.14)';
    g.fillRect(0, 0, W, 5);
    g.fillRect(0, H - 5, W, 5);
    g.fillStyle = 'rgba(255,224,160,.025)';
    for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
  };

  window.AshvaultGbaVisuals = Object.freeze({ enabled: true, palette: FE });
})();
