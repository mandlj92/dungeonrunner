'use strict';

(() => {
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
    const widths = [window.innerWidth, root.clientWidth, visual?.width].map(finitePositive).filter(Boolean);
    const heights = [window.innerHeight, root.clientHeight, visual?.height].map(finitePositive).filter(Boolean);
    return {
      width: Math.max(...widths, 320),
      height: Math.max(...heights, 180)
    };
  }

  function fitGame() {
    const { width: viewportWidth, height: viewportHeight } = viewportBox();
    const rootStyle = getComputedStyle(document.documentElement);
    const safeLeft = parseFloat(rootStyle.getPropertyValue('--safe-left')) || 0;
    const safeRight = parseFloat(rootStyle.getPropertyValue('--safe-right')) || 0;
    const safeTop = parseFloat(rootStyle.getPropertyValue('--safe-top')) || 0;
    const safeBottom = parseFloat(rootStyle.getPropertyValue('--safe-bottom')) || 0;

    const availableWidth = Math.max(320, viewportWidth - safeLeft - safeRight);
    const availableHeight = Math.max(180, viewportHeight - safeTop - safeBottom);
    const scale = Math.min(availableWidth / 16, availableHeight / 9);
    const width = Math.max(320, Math.floor(scale * 16));
    const height = Math.max(180, Math.floor(scale * 9));

    app.style.setProperty('width', `${width}px`, 'important');
    app.style.setProperty('height', `${height}px`, 'important');
    app.style.setProperty('max-width', 'none', 'important');
    app.style.setProperty('max-height', 'none', 'important');

    gameCanvas.style.setProperty('width', '100%', 'important');
    gameCanvas.style.setProperty('height', '100%', 'important');
    gameCanvas.style.setProperty('max-width', 'none', 'important');
    gameCanvas.style.setProperty('max-height', 'none', 'important');

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
    setTimeout(fitGame, 220);
    setTimeout(fitGame, 600);
  }, { passive: true });
  window.addEventListener('pageshow', () => scheduleFit(0), { passive: true });
  document.addEventListener('fullscreenchange', () => scheduleFit(20), { passive: true });
  window.visualViewport?.addEventListener('resize', () => scheduleFit(20), { passive: true });
  window.visualViewport?.addEventListener('scroll', () => scheduleFit(20), { passive: true });

  fitGame();
  setTimeout(fitGame, 100);
  setTimeout(fitGame, 500);
})();
