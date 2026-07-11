'use strict';

(() => {
  const INTERNAL_WIDTH = 320;
  const INTERNAL_HEIGHT = 180;
  const app = document.querySelector('#app');

  function availableViewport() {
    const viewport = window.visualViewport;
    return {
      width: Math.floor(viewport?.width || window.innerWidth),
      height: Math.floor(viewport?.height || window.innerHeight)
    };
  }

  function fitIntegerScale() {
    if (!app || !canvas) return;
    const viewport = availableViewport();
    const scale = Math.max(1, Math.floor(Math.min(
      viewport.width / INTERNAL_WIDTH,
      viewport.height / INTERNAL_HEIGHT
    )));
    const width = INTERNAL_WIDTH * scale;
    const height = INTERNAL_HEIGHT * scale;

    app.style.width = `${width}px`;
    app.style.height = `${height}px`;
    app.style.maxWidth = 'none';
    app.style.maxHeight = 'none';
    app.style.border = '0';

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.imageRendering = 'pixelated';

    ctx.imageSmoothingEnabled = false;
    g.imageSmoothingEnabled = false;

    document.documentElement.style.setProperty('--integer-scale', String(scale));
    document.body.classList.toggle('integer-letterbox', width < viewport.width || height < viewport.height);
  }

  drawPost = function crispDrawPost() {
    // Preserve damage feedback without the soft scanline layer that blurred pixels.
    if (flash > 0) {
      g.fillStyle = `rgba(255,80,70,${flash * 0.34})`;
      g.fillRect(0, 0, W, H);
    }
  };

  const originalDraw = draw;
  draw = function crispDraw() {
    ctx.imageSmoothingEnabled = false;
    g.imageSmoothingEnabled = false;
    originalDraw();
  };

  window.addEventListener('resize', fitIntegerScale, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(fitIntegerScale, 100), { passive: true });
  window.visualViewport?.addEventListener('resize', fitIntegerScale, { passive: true });
  fitIntegerScale();
})();
