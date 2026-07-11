'use strict';

const PixelArt = (() => {
  const P = {
    transparent: null,
    ink: '#0b0c12', shadow: '#171722', outline: '#242431', steel0: '#343746', steel1: '#5a6070', steel2: '#9298a7',
    cloth0: '#4a2d25', cloth1: '#784834', cloth2: '#b77a45', gold0: '#8b5929', gold1: '#d0923c', gold2: '#f0c363',
    bone: '#e4d3aa', pale: '#f7e9c8', red0: '#711f2d', red1: '#bd3d42', red2: '#ef6b52', orange: '#f09a3e',
    cyan0: '#1e596b', cyan1: '#43a6b8', cyan2: '#91e0df', violet0: '#3a285d', violet1: '#7252a3', violet2: '#bd8ce0',
    green0: '#254633', green1: '#4b8557', floor0: '#171b27', floor1: '#202839', floor2: '#2d3548', floor3: '#41495b',
    wall0: '#202430', wall1: '#303644', wall2: '#505867', wall3: '#777d88'
  };

  const make = (w, h, painter) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    const px = (color, rx, ry, rw = 1, rh = 1) => { x.fillStyle = color; x.fillRect(rx, ry, rw, rh); };
    painter(px, x);
    return c;
  };

  const mirror = (source) => {
    const c = document.createElement('canvas'); c.width = source.width; c.height = source.height;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(source, 0, 0); return c;
  };

  const playerFrame = (dir, action, frame) => make(16, 18, (p) => {
    const bob = action === 'walk' ? (frame ? 1 : 0) : 0;
    const dash = action === 'dash';
    if (dash) {
      p(P.steel1, 0, 10, 3, 2); p(P.steel2, 2, 8, 3, 1); p(P.floor3, 0, 13, 5, 2);
    }
    p(P.ink, 5, 2 + bob, 6, 2); p(P.ink, 3, 4 + bob, 10, 8); p(P.ink, 4, 12 + bob, 8, 3);
    if (dir === 'down') {
      p(P.gold0, 5, 1 + bob, 6, 2); p(P.gold1, 4, 3 + bob, 8, 4); p(P.cloth2, 3, 6 + bob, 10, 4);
      p(P.ink, 5, 5 + bob, 6, 4); p(P.gold2, 6, 6 + bob, 1, 1); p(P.gold2, 9, 6 + bob, 1, 1);
      p(P.steel0, 5, 10 + bob, 6, 4); p(P.steel2, 6, 11 + bob, 4, 1);
      p(P.cloth0, frame ? 3 : 4, 14 + bob, 3, 3); p(P.cloth0, frame ? 10 : 9, 14 + bob, 3, 3);
    } else if (dir === 'up') {
      p(P.gold0, 5, 1 + bob, 6, 2); p(P.gold1, 4, 3 + bob, 8, 5); p(P.cloth2, 3, 7 + bob, 10, 5);
      p(P.cloth1, 5, 8 + bob, 6, 5); p(P.steel0, 5, 12 + bob, 6, 2);
      p(P.cloth0, frame ? 3 : 4, 14 + bob, 3, 3); p(P.cloth0, frame ? 10 : 9, 14 + bob, 3, 3);
    } else {
      p(P.gold0, 5, 1 + bob, 6, 2); p(P.gold1, 4, 3 + bob, 7, 4); p(P.cloth2, 3, 6 + bob, 9, 5);
      p(P.ink, 6, 5 + bob, 5, 4); p(P.gold2, 9, 6 + bob, 1, 1);
      p(P.steel0, 5, 10 + bob, 6, 4); p(P.cloth0, frame ? 4 : 5, 14 + bob, 3, 3); p(P.cloth0, frame ? 10 : 9, 14 + bob, 3, 3);
      const recoil = action === 'shoot' && frame ? 1 : 0;
      p(P.ink, 10 - recoil, 8 + bob, 4, 2); p(P.steel2, 12 - recoil, 8 + bob, 3, 2); p(P.gold1, 14 - recoil, 9 + bob, 2, 1);
      if (action === 'shoot' && frame) { p(P.pale, 15, 8 + bob, 1, 1); p(P.orange, 15, 9 + bob, 1, 1); }
    }
    if (action === 'hurt') { p(P.red2, 2, 5, 2, 1); p(P.red1, 1, 7, 2, 1); }
  });

  const stalkerFrame = (dir, action, frame) => make(14, 16, (p) => {
    const bob = action === 'walk' ? frame : 0;
    p(P.ink, 3, 2 + bob, 8, 2); p(P.shadow, 2, 4 + bob, 10, 7); p(P.outline, 3, 10 + bob, 8, 3);
    p(P.red1, dir === 'right' ? 8 : 4, 5 + bob, 2, 1); p(P.red2, dir === 'right' ? 9 : 5, 6 + bob, 1, 1);
    p(P.steel0, 3, 11 + bob, 3, 3); p(P.steel0, 8, 11 + bob, 3, 3);
    if (action === 'attack') { p(P.red2, 10, 7, 3, 1); p(P.orange, 12, 6, 2, 1); p(P.red1, 11, 9, 2, 1); }
    if (action === 'hurt') { p(P.red2, 1, 4, 2, 1); p(P.red1, 0, 6, 2, 1); }
  });

  const bruteFrame = (dir, action, frame) => make(20, 20, (p) => {
    const bob = action === 'walk' ? frame : 0;
    p(P.ink, 4, 3 + bob, 12, 2); p(P.steel0, 2, 5 + bob, 16, 10); p(P.steel1, 4, 4 + bob, 12, 4);
    p(P.steel2, 6, 5 + bob, 8, 2); p(P.ink, 7, 7 + bob, 6, 3); p(P.red2, 8, 8 + bob, 1, 1); p(P.red2, 11, 8 + bob, 1, 1);
    p(P.cloth1, 1, 7 + bob, 3, 7); p(P.cloth1, 16, 7 + bob, 3, 7); p(P.gold0, 3, 13 + bob, 14, 2);
    p(P.steel0, 4, 15 + bob, 4, 4); p(P.steel0, 12, 15 + bob, 4, 4);
    if (dir === 'right') { p(P.ink, 14, 10 + bob, 5, 2); p(P.steel2, 17, 7 + bob, 3, 8); }
    if (action === 'attack') { p(P.steel2, 14, 2, 3, 12); p(P.pale, 17, 3, 2, 8); p(P.floor3, 16, 14, 4, 2); }
    if (action === 'hurt') { p(P.red2, 1, 4, 2, 2); p(P.red1, 0, 7, 2, 1); }
  });

  const shooterFrame = (dir, action, frame) => make(16, 18, (p) => {
    const bob = action === 'walk' ? frame : 0;
    p(P.ink, 5, 2 + bob, 6, 2); p(P.gold0, 4, 3 + bob, 8, 5); p(P.cloth2, 3, 7 + bob, 10, 5);
    p(P.ink, 5, 5 + bob, 6, 4); p(P.red2, dir === 'right' ? 9 : 6, 6 + bob, 1, 1);
    p(P.steel0, 5, 11 + bob, 6, 3); p(P.cloth0, frame ? 3 : 4, 14 + bob, 3, 3); p(P.cloth0, frame ? 10 : 9, 14 + bob, 3, 3);
    if (dir === 'right') {
      const recoil = action === 'shoot' && frame ? 1 : 0;
      p(P.ink, 10 - recoil, 8 + bob, 4, 2); p(P.steel2, 12 - recoil, 8 + bob, 3, 2); p(P.gold1, 14 - recoil, 9 + bob, 2, 1);
      if (action === 'shoot' && frame) { p(P.pale, 15, 7 + bob, 1, 1); p(P.orange, 15, 8 + bob, 1, 2); }
    }
    if (action === 'hurt') { p(P.red2, 2, 5, 2, 1); p(P.red1, 1, 7, 2, 1); }
  });

  const chargerFrame = (frame) => make(16, 16, (p) => {
    p(P.ink, 2, 5, 12, 6); p(P.red0, 3, 4, 10, 8); p(P.red1, 6, 3, 7, 9); p(P.red2, 10, 5, 4, 3);
    p(P.orange, 13, 6, 2, 1); p(P.steel0, 3, 11, 3, 3); p(P.steel0, 9, 11, 3, 3);
    if (frame) { p(P.floor3, 0, 7, 3, 1); p(P.floor2, 1, 10, 3, 1); }
  });

  const gravebinderFrame = (frame) => make(18, 20, (p) => {
    p(P.ink, 4, 2, 10, 2); p(P.violet0, 3, 4, 12, 11); p(P.violet1, 5, 3, 8, 5); p(P.ink, 6, 6, 6, 4);
    p(P.violet2, 7, 7, 1, 1); p(P.violet2, 10, 7, 1, 1); p(P.steel0, 5, 14, 3, 4); p(P.steel0, 10, 14, 3, 4);
    p(P.gold0, 14, 5, 2, 10); p(P.violet2, 13, 3 + frame, 4, 4); p(P.pale, 15, 4 + frame, 1, 1);
  });

  const bossFrame = (kind, frame) => make(kind === 'warden' ? 30 : 24, kind === 'warden' ? 30 : 24, (p) => {
    const s = kind === 'warden' ? 30 : 24; const c = Math.floor(s / 2);
    const base0 = kind === 'warden' ? P.gold0 : P.steel0; const base1 = kind === 'warden' ? P.gold1 : P.steel1;
    p(P.ink, 4, 4, s - 8, s - 6); p(base0, 3, 6, s - 6, s - 10); p(base1, 6, 4, s - 12, 7);
    p(P.ink, c - 5, 8, 10, 6); p(P.red2, c - 3, 10, 2, 2); p(P.red2, c + 2, 10, 2, 2);
    p(P.wall3, 2, 11, 5, 9); p(P.wall3, s - 7, 11, 5, 9); p(P.steel0, 6, s - 7, 5, 6); p(P.steel0, s - 11, s - 7, 5, 6);
    if (frame) { p(P.orange, c - 1, 2, 3, 3); p(P.gold2, c, 1, 1, 2); }
  });

  const dirFrames = (maker, actions) => {
    const out = {};
    for (const action of actions) {
      out[action] = { down: [], up: [], right: [], left: [] };
      for (let f = 0; f < 2; f++) {
        const down = maker('down', action, f), up = maker('up', action, f), right = maker('right', action, f);
        out[action].down.push(down); out[action].up.push(up); out[action].right.push(right); out[action].left.push(mirror(right));
      }
    }
    return out;
  };

  const sprites = {
    player: dirFrames(playerFrame, ['idle', 'walk', 'shoot', 'dash', 'hurt']),
    stalker: dirFrames(stalkerFrame, ['idle', 'walk', 'attack', 'hurt']),
    brute: dirFrames(bruteFrame, ['idle', 'walk', 'attack', 'hurt']),
    shooter: dirFrames(shooterFrame, ['idle', 'walk', 'shoot', 'hurt']),
    charger: { idle: [chargerFrame(0), chargerFrame(1)] },
    gravebinder: { idle: [gravebinderFrame(0), gravebinderFrame(1)] },
    revenant: { idle: [bossFrame('revenant', 0), bossFrame('revenant', 1)] },
    warden: { idle: [bossFrame('warden', 0), bossFrame('warden', 1)] }
  };

  const tiles = {
    floor: [
      make(8, 8, p => { p(P.floor1, 0, 0, 8, 8); p(P.floor2, 0, 0, 8, 1); p(P.floor0, 1, 7, 7, 1); p(P.floor3, 2, 3, 1, 1); p(P.floor0, 6, 5, 1, 1); }),
      make(8, 8, p => { p(P.floor2, 0, 0, 8, 8); p(P.floor1, 0, 1, 8, 6); p(P.floor3, 1, 1, 2, 1); p(P.floor0, 4, 5, 3, 1); }),
      make(8, 8, p => { p(P.floor1, 0, 0, 8, 8); p(P.floor2, 0, 0, 8, 1); p(P.floor0, 3, 2, 1, 4); p(P.floor0, 3, 5, 3, 1); p(P.floor3, 1, 6, 1, 1); })
    ],
    wallTop: make(8, 8, p => { p(P.wall0, 0, 0, 8, 8); p(P.wall3, 0, 0, 8, 2); p(P.wall2, 0, 2, 8, 2); p(P.wall1, 0, 4, 8, 3); p(P.ink, 0, 7, 8, 1); p(P.wall3, 1, 3, 3, 1); }),
    wallMid: make(8, 8, p => { p(P.wall1, 0, 0, 8, 8); p(P.wall2, 0, 0, 8, 1); p(P.wall0, 0, 4, 8, 1); p(P.wall3, 1, 1, 3, 1); p(P.wall3, 5, 5, 2, 1); })
  };

  const props = {
    urn: make(12, 14, p => { p(P.ink, 3, 0, 6, 2); p(P.gold1, 4, 1, 4, 1); p(P.ink, 2, 2, 8, 10); p(P.cloth0, 2, 3, 8, 8); p(P.cloth1, 3, 4, 6, 6); p(P.orange, 4, 6, 1, 2); p(P.orange, 7, 6, 1, 2); p(P.gold0, 3, 11, 6, 2); }),
    chest: make(18, 13, p => { p(P.ink, 1, 2, 16, 10); p(P.cloth0, 2, 3, 14, 8); p(P.cloth2, 3, 3, 12, 3); p(P.gold0, 2, 6, 14, 2); p(P.steel2, 8, 5, 3, 5); p(P.gold2, 9, 7, 1, 2); }),
    heart: make(9, 9, p => { p(P.ink, 1, 1, 3, 2); p(P.ink, 5, 1, 3, 2); p(P.red1, 1, 2, 7, 4); p(P.red2, 2, 2, 2, 2); p(P.red0, 2, 6, 5, 1); p(P.red0, 3, 7, 3, 1); p(P.red0, 4, 8, 1, 1); }),
    ember: make(7, 9, p => { p(P.orange, 2, 1, 3, 6); p(P.red1, 1, 4, 5, 3); p(P.gold2, 3, 0, 1, 6); p(P.pale, 3, 4, 1, 2); p(P.ink, 1, 7, 5, 2); }),
    pistol: make(12, 7, p => { p(P.ink, 1, 1, 9, 3); p(P.steel2, 2, 1, 7, 2); p(P.steel0, 8, 2, 3, 2); p(P.cloth1, 4, 4, 3, 3); }),
    scatter: make(14, 7, p => { p(P.ink, 1, 1, 12, 3); p(P.steel2, 2, 1, 9, 2); p(P.orange, 7, 3, 3, 1); p(P.cloth1, 2, 4, 4, 3); }),
    arc: make(12, 12, p => { p(P.cloth1, 5, 3, 2, 9); p(P.gold1, 4, 1, 4, 4); p(P.violet2, 5, 0, 2, 2); p(P.pale, 6, 0, 1, 1); })
  };

  const fx = {
    playerBullet: make(7, 3, p => { p(P.orange, 0, 1, 5, 1); p(P.gold2, 2, 0, 5, 3); p(P.pale, 4, 1, 3, 1); }),
    enemyBullet: make(5, 5, p => { p(P.red0, 1, 0, 3, 5); p(P.red1, 0, 1, 5, 3); p(P.red2, 1, 1, 3, 3); p(P.pale, 2, 2, 1, 1); }),
    spark: make(7, 7, p => { p(P.gold2, 3, 0, 1, 7); p(P.gold2, 0, 3, 7, 1); p(P.orange, 1, 1, 1, 1); p(P.orange, 5, 1, 1, 1); p(P.orange, 1, 5, 1, 1); p(P.orange, 5, 5, 1, 1); }),
    nova: make(16, 16, p => { p(P.cyan1, 7, 0, 2, 16); p(P.cyan1, 0, 7, 16, 2); p(P.cyan2, 4, 4, 8, 8); p(P.ink, 6, 6, 4, 4); })
  };

  const ui = {
    portrait: make(18, 18, p => { p(P.ink, 1, 1, 16, 16); p(P.gold0, 3, 2, 12, 6); p(P.gold1, 4, 3, 10, 5); p(P.ink, 5, 6, 8, 7); p(P.gold2, 7, 8, 1, 1); p(P.gold2, 10, 8, 1, 1); p(P.steel0, 4, 13, 10, 3); })
  };

  const draw = (target, sprite, x, y, opts = {}) => {
    if (!sprite) return;
    const ox = opts.anchorX ?? Math.floor(sprite.width / 2);
    const oy = opts.anchorY ?? sprite.height - 2;
    target.save();
    target.globalAlpha = opts.alpha ?? 1;
    target.drawImage(sprite, Math.round(x - ox), Math.round(y - oy));
    target.restore();
  };

  const direction = (angle) => {
    const x = Math.cos(angle), y = Math.sin(angle);
    if (Math.abs(x) > Math.abs(y)) return x >= 0 ? 'right' : 'left';
    return y >= 0 ? 'down' : 'up';
  };

  const spriteFor = (kind, action, dir, frame = 0) => {
    const s = sprites[kind]; if (!s) return null;
    if (s[action]?.[dir]) return s[action][dir][frame % s[action][dir].length];
    if (s.idle?.[dir]) return s.idle[dir][frame % s.idle[dir].length];
    if (Array.isArray(s.idle)) return s.idle[frame % s.idle.length];
    return null;
  };

  return { P, sprites, tiles, props, fx, ui, draw, direction, spriteFor };
})();