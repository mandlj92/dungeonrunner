'use strict';

(() => {
  function safeOutline(sprite, x, y, anchorY) {
    const dx = Math.round(x - sprite.width / 2);
    const dy = Math.round(y - anchorY);
    g.save();
    g.globalAlpha = 0.9;
    g.filter = 'brightness(0) saturate(100%)';
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      g.drawImage(sprite, dx + ox, dy + oy);
    }
    g.filter = 'none';
    g.restore();
  }

  drawPlayer = function tacticalPlayer() {
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
    safeOutline(sprite, player.x, player.y, sprite.height - 1);
    PixelArt.draw(g, sprite, player.x, player.y, { anchorY: sprite.height - 1 });
    if (player.nova >= 100) {
      g.globalAlpha = 0.45 + Math.sin(elapsed * 8) * 0.15;
      g.strokeStyle = '#f2c25c';
      g.strokeRect(Math.round(player.x - 8), Math.round(player.y - 18), 16, 19);
      g.globalAlpha = 1;
    }
  };

  drawEnemy = function tacticalEnemy(e) {
    const x = Math.round(e.x);
    const y = Math.round(e.y);
    if (e.type === 'charger' && e.telegraph > 0) {
      const a = Math.atan2(player.y - e.y, player.x - e.x);
      g.strokeStyle = Math.floor(elapsed * 18) % 2 ? PixelArt.P.red2 : PixelArt.P.red0;
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
    }
    const frame = Math.floor(elapsed * 7 + e.phase * 2) % 2;
    const sprite = ['stalker', 'brute', 'shooter'].includes(e.type)
      ? PixelArt.spriteFor(e.type, enemyAction(e), enemyDirection(e), frame)
      : PixelArt.spriteFor(e.type, 'idle', 'down', frame);
    safeOutline(sprite, x, y, sprite.height - 1);
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
    if (e.elite) {
      g.fillStyle = '#f2c25c';
      g.fillRect(x - 3, y - sprite.height - 3, 7, 1);
      g.fillRect(x - 1, y - sprite.height - 5, 3, 1);
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
  };
})();
