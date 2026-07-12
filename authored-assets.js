'use strict';

(() => {
  if (typeof Image === 'undefined' || typeof PixelArt === 'undefined') return;

  const chunks = window.AshvaultAuthoredArtChunks;
  const artData = chunks && Object.fromEntries(
    Object.entries(chunks).map(([key, parts]) => [key, `data:image/png;base64,${parts.join('')}`])
  );
  if (!artData || !artData.player || !artData.stalker || !artData.shooter || !artData.brute || !artData.world) {
    console.warn('Ashvault authored art data is unavailable; using fallback graphics.');
    return;
  }

  const BUILD = 12;
  const DIRECTIONS = ['down', 'right', 'up', 'left'];
  const characterSheets = {
    player: {
      src: artData.player,
      frameW: 32,
      frameH: 24,
      frames: 4,
      actions: { idle: 0, walk: 4, shoot: 8, dash: 12, hurt: 16, death: 20 }
    },
    stalker: {
      src: artData.stalker,
      frameW: 28,
      frameH: 24,
      frames: 4,
      actions: { idle: 0, walk: 4, attack: 8, hurt: 12, death: 16 }
    },
    shooter: {
      src: artData.shooter,
      frameW: 32,
      frameH: 24,
      frames: 4,
      actions: { idle: 0, walk: 4, shoot: 8, hurt: 12, death: 16 }
    },
    brute: {
      src: artData.brute,
      frameW: 40,
      frameH: 32,
      frames: 4,
      actions: { idle: 0, walk: 4, attack: 8, hurt: 12, death: 16 }
    }
  };

  const worldFrames = {
    floor0: [2, 2, 16, 16], floor1: [20, 2, 16, 16], floor2: [38, 2, 16, 16],
    floor3: [56, 2, 16, 16], floorCracked: [74, 2, 16, 16],
    wallTop0: [92, 2, 16, 8], wallTop1: [110, 2, 16, 8],
    wallMid0: [128, 2, 16, 16], wallMid1: [146, 2, 16, 16],
    urn: [164, 2, 20, 22], chest: [186, 2, 24, 18], chestOpen: [212, 2, 24, 20],
    ember: [238, 2, 12, 16], heart: [2, 26, 14, 14],
    pistol: [18, 26, 18, 12], scatter: [38, 26, 24, 12], arc: [64, 26, 18, 20],
    playerBullet: [84, 26, 14, 6], enemyBullet: [100, 26, 10, 10],
    spark: [112, 26, 16, 16], nova: [130, 26, 28, 28], portrait: [160, 26, 28, 28]
  };

  const artState = { loaded: false, error: null };

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load authored art: ${src}`));
      image.src = src;
    });
  }

  function slice(image, sx, sy, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.drawImage(image, sx, sy, width, height, 0, 0, width, height);
    return canvas;
  }

  function buildCharacter(image, config) {
    const output = {};
    for (const [action, firstRow] of Object.entries(config.actions)) {
      output[action] = { down: [], right: [], up: [], left: [] };
      for (let directionIndex = 0; directionIndex < DIRECTIONS.length; directionIndex++) {
        const direction = DIRECTIONS[directionIndex];
        const row = firstRow + directionIndex;
        for (let frame = 0; frame < config.frames; frame++) {
          output[action][direction].push(slice(
            image,
            frame * config.frameW,
            row * config.frameH,
            config.frameW,
            config.frameH
          ));
        }
      }
    }
    return output;
  }

  function frameFor(kind, action, direction, speed, phase = 0) {
    const frames = PixelArt.sprites[kind]?.[action]?.[direction]
      || PixelArt.sprites[kind]?.idle?.[direction]
      || PixelArt.sprites[kind]?.idle;
    if (!frames?.length) return PixelArt.spriteFor(kind, action, direction, 0);
    const frame = Math.floor(elapsed * speed + phase) % frames.length;
    return frames[frame];
  }

  function drawRepeatedTile(tile, x, y, width, height) {
    for (let yy = 0; yy < height; yy += tile.height) {
      for (let xx = 0; xx < width; xx += tile.width) {
        const drawWidth = Math.min(tile.width, width - xx);
        const drawHeight = Math.min(tile.height, height - yy);
        g.drawImage(tile, 0, 0, drawWidth, drawHeight, x + xx, y + yy, drawWidth, drawHeight);
      }
    }
  }

  function installRenderers() {
    drawFloor = function authoredFloor() {
      const tiles = PixelArt.tiles.floor;
      g.fillStyle = '#17171c';
      g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 16) {
        for (let x = 0; x < W; x += 16) {
          const index = Math.abs(((x / 16 * 13) ^ (y / 16 * 7) ^ (roomNo * 17))) % tiles.length;
          g.drawImage(tiles[index], x, y);
        }
      }

      const themeOverlay = room?.theme === 1
        ? 'rgba(78,22,45,.22)'
        : room?.theme === 2
          ? 'rgba(92,49,18,.20)'
          : 'rgba(24,24,30,.18)';
      g.fillStyle = themeOverlay;
      g.fillRect(0, 0, W, H);

      if (!room) return;
      const accent = PALETTES[room.theme || 0].accent;
      room.runes.forEach((r, index) => {
        const pulse = Math.floor(elapsed * 5 + index) & 1;
        const radius = Math.max(4, Math.round(r.r / 2));
        g.globalAlpha = pulse ? 0.52 : 0.30;
        g.strokeStyle = accent;
        g.strokeRect(Math.round(r.x - radius), Math.round(r.y - radius), radius * 2, radius * 2);
        g.strokeRect(Math.round(r.x - radius + 3), Math.round(r.y - radius + 3), Math.max(1, radius * 2 - 6), Math.max(1, radius * 2 - 6));
        g.fillStyle = accent;
        g.fillRect(Math.round(r.x - 1), Math.round(r.y - radius - 2), 3, 3);
        g.fillRect(Math.round(r.x - 1), Math.round(r.y + radius), 3, 3);
        g.fillRect(Math.round(r.x - radius - 2), Math.round(r.y - 1), 3, 3);
        g.fillRect(Math.round(r.x + radius), Math.round(r.y - 1), 3, 3);
        g.globalAlpha = 1;
      });
    };

    drawObs = function authoredObstacle(obstacle) {
      const x = Math.round(obstacle.x);
      const y = Math.round(obstacle.y);
      const width = Math.round(obstacle.w);
      const height = Math.round(obstacle.h);
      const midTiles = PixelArt.tiles.authoredWallMid;
      const topTiles = PixelArt.tiles.authoredWallTop;

      g.fillStyle = '#111116';
      g.fillRect(x - 1, y + 2, width + 2, height + 2);
      for (let yy = 0; yy < height; yy += 16) {
        const tile = midTiles[Math.abs((Math.floor(yy / 16) + Math.floor(x / 16))) % midTiles.length];
        drawRepeatedTile(tile, x, y + yy, width, Math.min(16, height - yy));
      }
      for (let xx = 0; xx < width; xx += 16) {
        const tile = topTiles[Math.abs((Math.floor(xx / 16) + roomNo)) % topTiles.length];
        const drawWidth = Math.min(16, width - xx);
        g.drawImage(tile, 0, 0, drawWidth, tile.height, x + xx, y, drawWidth, tile.height);
      }
      g.fillStyle = 'rgba(10,9,12,.75)';
      g.fillRect(x, y + height - 2, width, 2);
    };

    drawPlayer = function authoredPlayer() {
      if (!player) return;
      if (player.inv > 0 && Math.floor(elapsed * 20) % 2) return;
      const direction = PixelArt.direction(player.aim);
      const moving = isPlayerMoving();
      let action = moving ? 'walk' : 'idle';
      let speed = moving ? 9 : 4;
      if (player.dashTime > 0) { action = 'dash'; speed = 16; }
      else if (elapsed - player.lastShot < 0.16) { action = 'shoot'; speed = 18; }
      else if (player.inv > 0.05 && flash > 0.05) { action = 'hurt'; speed = 12; }
      const sprite = frameFor('player', action, direction, speed);
      PixelArt.draw(g, sprite, player.x, player.y + 1, { anchorY: sprite.height - 1 });
      if (player.nova >= 100) {
        g.globalAlpha = 0.45 + (Math.floor(elapsed * 8) & 1) * 0.25;
        g.strokeStyle = '#f0b24d';
        g.strokeRect(Math.round(player.x - 9), Math.round(player.y - 23), 18, 24);
        g.globalAlpha = 1;
      }
    };

    drawEnemy = function authoredEnemy(enemy) {
      const x = Math.round(enemy.x);
      const y = Math.round(enemy.y);
      if (enemy.type === 'charger' && enemy.telegraph > 0) {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        g.strokeStyle = Math.floor(elapsed * 18) % 2 ? PixelArt.P.red2 : PixelArt.P.red0;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(angle) * 105, y + Math.sin(angle) * 105);
        g.stroke();
      }
      if ((enemy.type === 'revenant' && enemy.slam > 0) || (enemy.type === 'warden' && enemy.attack < 0.2)) {
        g.strokeStyle = PixelArt.P.gold2;
        g.strokeRect(x - enemy.r - 4, y - enemy.r - 4, enemy.r * 2 + 8, enemy.r * 2 + 8);
      }
      if (enemy.elite && enemy.maxShield > 0) {
        g.strokeStyle = PixelArt.P.cyan2;
        g.strokeRect(x - enemy.r - 2, y - enemy.r - 2, enemy.r * 2 + 4, enemy.r * 2 + 4);
      }

      const authored = ['stalker', 'brute', 'shooter'].includes(enemy.type);
      const action = authored ? enemyAction(enemy) : 'idle';
      const direction = authored ? enemyDirection(enemy) : 'down';
      const speed = action === 'walk' ? 8 : action === 'idle' ? 4 : 12;
      const sprite = frameFor(enemy.type, action, direction, speed, enemy.phase * 2);
      if (!sprite) return;

      g.globalAlpha = enemy.hit > 0 ? 0.58 : 1;
      PixelArt.draw(g, sprite, x, y + 1, { anchorY: sprite.height - 1 });
      g.globalAlpha = 1;

      if (enemy.elite) {
        g.fillStyle = '#efb34a';
        g.fillRect(x - 3, y - sprite.height - 3, 7, 1);
        g.fillRect(x - 1, y - sprite.height - 5, 3, 1);
      }
      if (enemy.burn > 0) {
        const fireY = y - Math.max(enemy.r + 5, sprite.height - 4);
        g.fillStyle = Math.floor(elapsed * 12) % 2 ? PixelArt.P.gold2 : PixelArt.P.red2;
        g.fillRect(x - 2, fireY, 2, 3);
        g.fillStyle = PixelArt.P.orange;
        g.fillRect(x + 1, fireY + 1, 2, 2);
      }
      if (enemy.hp < enemy.maxHp || enemy.type === 'revenant' || enemy.type === 'warden') {
        const width = enemy.type === 'warden' ? 44 : enemy.type === 'revenant' ? 35 : Math.max(12, enemy.r * 2 + 2);
        const barY = y - Math.max(enemy.r + 8, sprite.height + 4);
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

    drawHazard = function authoredHazard(hazard) {
      const bob = Math.round(Math.sin(hazard.pulse || 0));
      PixelArt.draw(g, PixelArt.props.urn, hazard.x, hazard.y + 2 + bob, { anchorY: PixelArt.props.urn.height - 1 });
      if (hazard.hp < hazard.maxHp) {
        g.fillStyle = PixelArt.P.red2;
        g.fillRect(Math.round(hazard.x - 6), Math.round(hazard.y - 12), Math.max(1, Math.round(12 * hazard.hp / hazard.maxHp)), 2);
      }
    };

    drawDrop = function authoredDrop(drop) {
      const bob = Math.round(Math.sin(elapsed * 5) * 1);
      let sprite = PixelArt.props.ember;
      if (drop.type === 'heart') sprite = PixelArt.props.heart;
      else if (drop.type === 'weapon') sprite = PixelArt.props[drop.weapon] || PixelArt.props.pistol;
      PixelArt.draw(g, sprite, drop.x, drop.y + bob, { anchorY: sprite.height - 1 });
    };

    drawBullet = function authoredBullet(bullet) {
      const angle = Math.atan2(bullet.vy, bullet.vx);
      const sprite = bullet.enemy ? PixelArt.fx.enemyBullet : PixelArt.fx.playerBullet;
      g.save();
      g.translate(Math.round(bullet.x), Math.round(bullet.y));
      g.rotate(angle);
      g.drawImage(sprite, -Math.floor(sprite.width / 2), -Math.floor(sprite.height / 2));
      g.restore();
    };

    drawParticle = function authoredParticle(particle) {
      const alpha = clamp(particle.life / particle.max, 0, 1);
      if (particle.r >= 2 && alpha > 0.45) {
        const size = Math.max(5, Math.min(10, Math.round(particle.r * 4)));
        g.globalAlpha = alpha;
        g.drawImage(PixelArt.fx.spark, Math.round(particle.x - size / 2), Math.round(particle.y - size / 2), size, size);
        g.globalAlpha = 1;
        return;
      }
      g.globalAlpha = alpha;
      g.fillStyle = particle.color;
      g.fillRect(Math.round(particle.x), Math.round(particle.y), Math.max(1, particle.r), Math.max(1, particle.r));
      g.globalAlpha = 1;
    };

    drawWave = function authoredWave(wave) {
      const alpha = clamp(wave.life / wave.max, 0, 1);
      const size = Math.max(8, Math.round(wave.r * 2));
      g.globalAlpha = alpha * 0.82;
      g.drawImage(PixelArt.fx.nova, Math.round(wave.x - size / 2), Math.round(wave.y - size / 2), size, size);
      g.globalAlpha = 1;
    };

    function panel(x, y, width, height) {
      g.fillStyle = '#17151b';
      g.fillRect(x, y, width, height);
      g.fillStyle = '#4b4650';
      g.fillRect(x + 1, y + 1, width - 2, height - 2);
      g.fillStyle = '#26232c';
      g.fillRect(x + 2, y + 2, width - 4, height - 4);
      g.fillStyle = '#c0b4a1';
      g.fillRect(x + 2, y + 2, width - 4, 1);
      g.fillStyle = '#111016';
      g.fillRect(x + 2, y + height - 3, width - 4, 1);
    }

    drawHud = function authoredHud() {
      if (!player || state === 'menu') return;
      panel(3, 3, 126, 35);
      g.drawImage(PixelArt.ui.portrait, 5, 5);
      g.fillStyle = '#501a24';
      g.fillRect(36, 8, 74, 7);
      g.fillStyle = '#bd3538';
      g.fillRect(37, 9, Math.floor(72 * clamp(player.hp / player.maxHp, 0, 1)), 5);
      g.fillStyle = '#ef5c45';
      g.fillRect(37, 9, Math.floor(72 * clamp(player.hp / player.maxHp, 0, 1)), 1);
      g.fillStyle = '#efe2c5';
      g.font = 'bold 5px monospace';
      g.textAlign = 'left';
      g.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, 37, 21);
      PixelArt.draw(g, PixelArt.props[player.weapon] || PixelArt.props.pistol, 37, 23, { anchorX: 0, anchorY: 0 });
      g.fillStyle = WEAPONS[player.weapon].color;
      g.fillText(`${WEAPONS[player.weapon].short} R${player.weaponRanks[player.weapon]}`, 61, 29);
      g.fillStyle = '#17151b';
      g.fillRect(37, 32, 73, 3);
      g.fillStyle = player.nova >= 100 ? '#f0b24d' : '#8b62c3';
      g.fillRect(38, 33, Math.floor(71 * player.nova / 100), 1);

      panel(W - 96, 3, 93, 29);
      g.textAlign = 'right';
      g.fillStyle = '#efe2c5';
      g.fillText(`CHAMBER ${roomNo}/10`, W - 7, 11);
      g.fillStyle = '#c9b28c';
      g.fillText(room?.route?.name || room?.mod.name || '', W - 7, 19);
      g.fillStyle = '#f0b24d';
      g.fillText(score.toLocaleString().padStart(7, '0'), W - 7, 27);

      if (combo > 1) {
        panel(W - 70, 35, 67, 17);
        g.fillStyle = '#f0b24d';
        g.font = 'bold 8px monospace';
        g.fillText(`x${comboMultiplier.toFixed(2)}`, W - 7, 45);
        g.font = 'bold 5px monospace';
        g.fillStyle = '#efe2c5';
        g.fillText(`${combo} HITS`, W - 7, 51);
      }

      panel(3, H - 19, 131, 16);
      g.textAlign = 'left';
      g.fillStyle = bountyComplete ? '#5d9a65' : '#f0b24d';
      g.fillText(currentBounty?.name || 'NO BOUNTY', 7, H - 11);
      g.fillStyle = '#efe2c5';
      g.fillText(bountyComplete ? 'COMPLETE' : `${Math.min(bountyProgress, currentBounty?.target || 0)}/${currentBounty?.target || 0}`, 7, H - 5);

      panel(138, H - 16, 49, 13);
      const ready = clamp((elapsed - player.dashAt) / player.dashCd, 0, 1);
      g.fillStyle = '#17151b';
      g.fillRect(143, H - 9, 39, 3);
      g.fillStyle = '#efe2c5';
      g.fillRect(143, H - 9, Math.floor(39 * ready), 3);
      g.fillText('DASH', 143, H - 11);

      panel(191, H - 17, 73, 14);
      let iconX = 194;
      for (const id of Object.keys(WEAPONS)) {
        g.globalAlpha = player.arsenal[id] ? 1 : 0.25;
        PixelArt.draw(g, PixelArt.props[id] || PixelArt.props.pistol, iconX, H - 15, { anchorX: 0, anchorY: 0 });
        if (id === player.weapon) {
          g.fillStyle = '#f0b24d';
          g.fillRect(iconX - 1, H - 5, 21, 2);
        }
        g.globalAlpha = 1;
        iconX += 24;
      }
    };

    drawPost = function authoredPost() {
      if (flash > 0) {
        g.fillStyle = `rgba(255,80,70,${flash * 0.38})`;
        g.fillRect(0, 0, W, H);
      }
      g.strokeStyle = '#111016';
      g.lineWidth = 2;
      g.strokeRect(1, 1, W - 2, H - 2);
    };
  }

  async function install() {
    const entries = Object.entries(characterSheets);
    const images = await Promise.all([
      ...entries.map(([, config]) => loadImage(config.src)),
      loadImage(artData.world)
    ]);

    entries.forEach(([kind, config], index) => {
      PixelArt.sprites[kind] = buildCharacter(images[index], config);
    });

    const world = images[images.length - 1];
    const assets = Object.fromEntries(Object.entries(worldFrames).map(([name, frame]) => [name, slice(world, ...frame)]));
    PixelArt.tiles.floor = [assets.floor0, assets.floor1, assets.floor2, assets.floor3, assets.floorCracked];
    PixelArt.tiles.wallTop = assets.wallTop0;
    PixelArt.tiles.wallMid = assets.wallMid0;
    PixelArt.tiles.authoredWallTop = [assets.wallTop0, assets.wallTop1];
    PixelArt.tiles.authoredWallMid = [assets.wallMid0, assets.wallMid1];
    PixelArt.props.urn = assets.urn;
    PixelArt.props.chest = assets.chest;
    PixelArt.props.chestOpen = assets.chestOpen;
    PixelArt.props.ember = assets.ember;
    PixelArt.props.heart = assets.heart;
    PixelArt.props.pistol = assets.pistol;
    PixelArt.props.scatter = assets.scatter;
    PixelArt.props.arc = assets.arc;
    PixelArt.fx.playerBullet = assets.playerBullet;
    PixelArt.fx.enemyBullet = assets.enemyBullet;
    PixelArt.fx.spark = assets.spark;
    PixelArt.fx.nova = assets.nova;
    PixelArt.ui.portrait = assets.portrait;

    installRenderers();
    artState.loaded = true;
    document.documentElement.dataset.authoredArt = 'ready';
    return true;
  }

  const ready = install().catch((error) => {
    artState.error = error;
    console.warn('Ashvault authored art fell back to code-drawn assets.', error);
    return false;
  });

  window.AshvaultAuthoredArt = { build: BUILD, state: artState, ready };
})();
