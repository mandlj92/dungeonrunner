'use strict';

(() => {
  const app = document.querySelector('#app');
  if (!app) return;

  let resizeTimer = 0;

  function finitePositive(value) {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function viewportBox() {
    const root = document.documentElement;
    const visual = window.visualViewport;

    const widths = [
      finitePositive(window.innerWidth),
      finitePositive(root.clientWidth),
      finitePositive(visual?.width)
    ].filter(Boolean);

    const heights = [
      finitePositive(window.innerHeight),
      finitePositive(root.clientHeight),
      finitePositive(visual?.height)
    ].filter(Boolean);

    return {
      width: Math.max(...widths, 320),
      height: Math.max(...heights, 180)
    };
  }

  function fitGame() {
    const { width: viewportWidth, height: viewportHeight } = viewportBox();
    const style = getComputedStyle(document.documentElement);
    const safeLeft = parseFloat(style.getPropertyValue('--safe-left')) || 0;
    const safeRight = parseFloat(style.getPropertyValue('--safe-right')) || 0;
    const safeTop = parseFloat(style.getPropertyValue('--safe-top')) || 0;
    const safeBottom = parseFloat(style.getPropertyValue('--safe-bottom')) || 0;

    const availableWidth = Math.max(320, viewportWidth - safeLeft - safeRight);
    const availableHeight = Math.max(180, viewportHeight - safeTop - safeBottom);
    const scale = Math.max(1, Math.min(availableWidth / 16, availableHeight / 9));
    const width = Math.floor(scale * 16);
    const height = Math.floor(scale * 9);

    app.style.setProperty('width', `${width}px`, 'important');
    app.style.setProperty('height', `${height}px`, 'important');
    app.style.setProperty('max-width', 'none', 'important');
    app.style.setProperty('max-height', 'none', 'important');

    document.documentElement.style.setProperty('--viewport-width', `${viewportWidth}px`);
    document.documentElement.style.setProperty('--viewport-height', `${viewportHeight}px`);
    document.body.classList.toggle('compact-landscape', viewportHeight < 520 && viewportWidth > viewportHeight);
  }

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
    scheduleFit(220);
    scheduleFit(600);
  }, { passive: true });
  window.addEventListener('pageshow', () => scheduleFit(0), { passive: true });
  document.addEventListener('fullscreenchange', () => scheduleFit(20), { passive: true });
  window.visualViewport?.addEventListener('resize', () => scheduleFit(20), { passive: true });
  window.visualViewport?.addEventListener('scroll', () => scheduleFit(20), { passive: true });

  fitGame();
  scheduleFit(100);
  scheduleFit(500);
})();
