'use strict';

(() => {
  const pauseControl = { x: W / 2, y: 10, w: 34, h: 12 };

  function isCoarsePointer() {
    return matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  }

  function insidePause(point) {
    return point.x >= pauseControl.x - pauseControl.w / 2
      && point.x <= pauseControl.x + pauseControl.w / 2
      && point.y >= pauseControl.y - pauseControl.h / 2
      && point.y <= pauseControl.y + pauseControl.h / 2;
  }

  canvas.addEventListener('touchstart', (event) => {
    for (const touchPoint of event.changedTouches) {
      const point = canvasPoint(touchPoint.clientX, touchPoint.clientY);
      if (!insidePause(point)) continue;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state === 'playing' || state === 'pause') {
        togglePause();
        try { navigator.vibrate?.(12); } catch { }
      }
      return;
    }
  }, { passive: false, capture: true });

  const previousDrawTouchControls = drawTouchControls;
  drawTouchControls = function releaseDrawTouchControls() {
    previousDrawTouchControls();
    if (!isCoarsePointer() && !touch.active) return;

    g.save();
    g.globalAlpha = 0.72;
    g.fillStyle = 'rgba(8,8,16,.62)';
    g.fillRect(
      pauseControl.x - pauseControl.w / 2,
      pauseControl.y - pauseControl.h / 2,
      pauseControl.w,
      pauseControl.h
    );
    g.strokeStyle = PixelArt.P.pale;
    g.strokeRect(
      pauseControl.x - pauseControl.w / 2,
      pauseControl.y - pauseControl.h / 2,
      pauseControl.w,
      pauseControl.h
    );
    g.fillStyle = PixelArt.P.pale;
    g.font = 'bold 4px monospace';
    g.textAlign = 'center';
    g.fillText(state === 'pause' ? 'RESUME' : 'PAUSE', pauseControl.x, pauseControl.y + 2);
    g.restore();
  };

  function showConnectionToast(message) {
    if (typeof toast === 'function') toast(message);
  }

  window.addEventListener('offline', () => showConnectionToast('OFFLINE MODE'));
  window.addEventListener('online', () => showConnectionToast('CONNECTION RESTORED'));

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .catch((error) => console.warn('Service worker registration failed:', error));
    });
  }
})();
