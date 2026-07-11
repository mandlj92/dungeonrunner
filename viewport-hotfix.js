'use strict';

(() => {
  const INTERNAL_WIDTH = 320;
  const INTERNAL_HEIGHT = 180;
  const app = document.querySelector('#app');
  const gameCanvas = document.querySelector('#game');
  if (!app || !gameCanvas) return;

  let resizeTimer = 0;

  function finitePositive(value) {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function viewportBox() {
    const root = document.documentElement;
    const visual = window.visualViewport;
    return {
      width: Math.floor(
        finitePositive(visual?.width)
        || finitePositive(root.clientWidth)
        || finitePositive(window.innerWidth)
        || INTERNAL_WIDTH
      ),
      height: Math.floor(
        finitePositive(visual?.height)
        || finitePositive(root.clientHeight)
        || finitePositive(window.innerHeight)
        || INTERNAL_HEIGHT
      )
    };
  }

  function safeInsets() {
    const style = getComputedStyle(document.documentElement);
    return {
      left: parseFloat(style.getPropertyValue('--safe-left')) || 0,
      right: parseFloat(style.getPropertyValue('--safe-right')) || 0,
      top: parseFloat(style.getPropertyValue('--safe-top')) || 0,
      bottom: parseFloat(style.getPropertyValue('--safe-bottom')) || 0
    };
  }

  function enforceNativeFramebuffer() {
    if (gameCanvas.width !== INTERNAL_WIDTH) gameCanvas.width = INTERNAL_WIDTH;
    if (gameCanvas.height !== INTERNAL_HEIGHT) gameCanvas.height = INTERNAL_HEIGHT;
    if (screen.width !== INTERNAL_WIDTH) screen.width = INTERNAL_WIDTH;
    if (screen.height !== INTERNAL_HEIGHT) screen.height = INTERNAL_HEIGHT;
    ctx.imageSmoothingEnabled = false;
    g.imageSmoothingEnabled = false;
    ctx.filter = 'none';
    g.filter = 'none';
  }

  function fitGame() {
    const viewport = viewportBox();
    const inset = safeInsets();
    const availableWidth = Math.max(1, Math.floor(viewport.width - inset.left - inset.right));
    const availableHeight = Math.max(1, Math.floor(viewport.height - inset.top - inset.bottom));
    const rawScale = Math.min(availableWidth / INTERNAL_WIDTH, availableHeight / INTERNAL_HEIGHT);
    const wholeScale = Math.floor(rawScale);
    const scale = wholeScale >= 1 ? wholeScale : Math.max(0.5, rawScale);
    const width = Math.max(1, Math.floor(INTERNAL_WIDTH * scale));
    const height = Math.max(1, Math.floor(INTERNAL_HEIGHT * scale));

    enforceNativeFramebuffer();

    app.style.setProperty('width', `${width}px`, 'important');
    app.style.setProperty('height', `${height}px`, 'important');
    app.style.setProperty('max-width', 'none', 'important');
    app.style.setProperty('max-height', 'none', 'important');
    app.style.setProperty('border', '0', 'important');

    gameCanvas.style.setProperty('width', `${width}px`, 'important');
    gameCanvas.style.setProperty('height', `${height}px`, 'important');
    gameCanvas.style.setProperty('max-width', 'none', 'important');
    gameCanvas.style.setProperty('max-height', 'none', 'important');
    gameCanvas.style.setProperty('image-rendering', 'pixelated', 'important');

    document.documentElement.style.setProperty('--pixel-scale', String(scale));
    document.documentElement.style.setProperty('--viewport-width', `${viewport.width}px`);
    document.documentElement.style.setProperty('--viewport-height', `${viewport.height}px`);
    document.body.classList.toggle('integer-letterbox', wholeScale >= 1 && (width < availableWidth || height < availableHeight));
    document.body.classList.toggle('compact-landscape', viewport.height < 520 && viewport.width > viewport.height);
  }

  function crispFloor() {
    const theme = room?.theme || 0;
    const palette = PALETTES[theme];
    const tiles = PixelArt.tiles.floor;
    const tint = theme === 1 ? 'rgba(104,32,74,.15)' : theme === 2 ? 'rgba(130,68,24,.14)' : null;

    g.fillStyle = palette.floor2;
    g.fillRect(0, 0, W, H);

    for (let y = 0; y < H; y += 8) {
      for (let x = 0; x < W; x += 8) {
        const variant = Math.abs(((x / 8 * 13) ^ (y / 8 * 7) ^ (roomNo * 17))) % tiles.length;
        g.drawImage(tiles[variant], x, y);

        if (tint) {
          g.fillStyle = tint;
          g.fillRect(x, y, 8, 8);
        }

        const band = Math.floor(Math.hypot(x + 4 - W / 2, y + 4 - H / 2) / 58);
        if (band > 1) {
          g.fillStyle = `rgba(0,0,0,${Math.min(0.16, (band - 1) * 0.045)})`;
          g.fillRect(x, y, 8, 8);
        }
      }
    }

    if (!room) return;
    for (let i = 0; i < room.runes.length; i++) {
      const rune = room.runes[i];
      const pulse = Math.floor(elapsed * 4 + i) % 2;
      const x = Math.round(rune.x);
      const y = Math.round(rune.y);
      const size = Math.max(4, Math.round(rune.r));
      g.globalAlpha = pulse ? 0.42 : 0.24;
      g.strokeStyle = palette.accent;
      g.strokeRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
      g.fillRect(x - 1, y - 1, 3, 3);
      g.fillRect(Math.round(x - size / 3), y, Math.max(1, Math.round(size * 0.65)), 1);
      g.fillRect(x, Math.round(y - size / 3), 1, Math.max(1, Math.round(size * 0.65)));
    }
    g.globalAlpha = 1;
  }

  function crispObstacle(obstacle) {
    const x0 = Math.round(obstacle.x);
    const y0 = Math.round(obstacle.y);
    const width = Math.round(obstacle.w);
    const height = Math.round(obstacle.h);
    const top = PixelArt.tiles.wallTop;
    const middle = PixelArt.tiles.wallMid;

    g.fillStyle = PixelArt.P.ink;
    g.fillRect(x0 - 1, y0 - 1, width + 2, height + 3);
    g.fillStyle = PixelArt.P.wall0;
    g.fillRect(x0, y0, width, height);

    for (let x = x0; x < x0 + width; x += 8) {
      g.drawImage(top, x, y0, Math.min(8, x0 + width - x), 8);
    }
    for (let y = y0 + 8; y < y0 + height; y += 8) {
      for (let x = x0; x < x0 + width; x += 8) {
        g.drawImage(middle, x, y, Math.min(8, x0 + width - x), Math.min(8, y0 + height - y));
      }
    }

    g.fillStyle = PixelArt.P.wall3;
    g.fillRect(x0 + 1, y0 + 1, Math.max(1, width - 2), 1);
    g.fillStyle = PixelArt.P.ink;
    g.fillRect(x0, y0 + height - 2, width, 2);
  }

  drawFloor = crispFloor;
  drawObs = crispObstacle;
  drawPost = function crispPost() {
    if (flash > 0) {
      g.fillStyle = `rgba(255,80,70,${flash * 0.34})`;
      g.fillRect(0, 0, W, H);
    }

    g.fillStyle = PixelArt.P.ink;
    g.fillRect(0, 0, W, 1);
    g.fillRect(0, H - 1, W, 1);
    g.fillRect(0, 0, 1, H);
    g.fillRect(W - 1, 0, 1, H);
  };

  const previousDraw = draw;
  draw = function pixelPerfectDraw() {
    enforceNativeFramebuffer();
    previousDraw();
  };

  function scheduleFit(delay = 0) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      fitGame();
      requestAnimationFrame(fitGame);
    }, delay);
  }

  window.addEventListener('resize', () => scheduleFit(20), { passive: true });
  window.addEventListener('orientationchange', () => {
    scheduleFit(50);
    setTimeout(fitGame, 220);
    setTimeout(fitGame, 600);
  }, { passive: true });
  window.addEventListener('pageshow', () => scheduleFit(0), { passive: true });
  document.addEventListener('fullscreenchange', () => scheduleFit(20), { passive: true });
  window.visualViewport?.addEventListener('resize', () => scheduleFit(20), { passive: true });
  window.visualViewport?.addEventListener('scroll', () => scheduleFit(20), { passive: true });

  document.body.style.setProperty('background', '#080810', 'important');
  document.body.style.setProperty('background-image', 'none', 'important');
  fitGame();
  setTimeout(fitGame, 100);
  setTimeout(fitGame, 500);
})();
