'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const chunkFiles = [
  'authored-player-0.js', 'authored-player-1.js', 'authored-player-2.js',
  'authored-stalker-0.js', 'authored-stalker-1.js',
  'authored-shooter-0.js', 'authored-shooter-1.js',
  'authored-brute-0.js', 'authored-brute-1.js', 'authored-brute-2.js', 'authored-brute-3.js',
  'authored-world-0.js'
];

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const file of chunkFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInContext(source, sandbox, { filename: file });
}

const chunks = sandbox.window.AshvaultAuthoredArtChunks;
assert.ok(chunks, 'Authored art chunks were not initialized');
assert.deepEqual(Object.keys(chunks).sort(), ['brute', 'player', 'shooter', 'stalker', 'world']);

const minimumBytes = {
  player: 12000,
  stalker: 9000,
  shooter: 10000,
  brute: 22000,
  world: 1500
};
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
for (const [name, parts] of Object.entries(chunks)) {
  assert.ok(Array.isArray(parts) && parts.length > 0, `${name} atlas has no data chunks`);
  const image = Buffer.from(parts.join(''), 'base64');
  assert.ok(image.subarray(0, 8).equals(pngSignature), `${name} atlas is not a PNG`);
  assert.ok(image.length >= minimumBytes[name], `${name} atlas is unexpectedly small`);
}

const loader = fs.readFileSync(path.join(root, 'authored-assets.js'), 'utf8');
for (const renderer of ['drawFloor =', 'drawObs =', 'drawPlayer =', 'drawEnemy =', 'drawHud =', 'drawPost =']) {
  assert.ok(loader.includes(renderer), `Authored loader does not replace ${renderer}`);
}
assert.ok(loader.includes('const BUILD = 12'), 'Authored art loader build number is not 12');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const file of [...chunkFiles, 'authored-assets.js']) {
  assert.ok(html.includes(`${file}?v=12`), `${file} is not versioned and referenced by index.html`);
}
assert.ok(
  html.indexOf('authored-world-0.js?v=12') < html.indexOf('authored-assets.js?v=12'),
  'Authored atlas data must load before the art installer'
);
assert.ok(html.includes('AUTHORED ART EDITION · BUILD 12'), 'Build 12 release label is missing');

const serviceWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
for (const file of [...chunkFiles, 'authored-assets.js']) {
  assert.ok(serviceWorker.includes(`${file}?v=12`), `${file} is not cached for offline play`);
}
assert.ok(serviceWorker.includes("ashvault-build-12"), 'Service worker cache was not advanced to Build 12');

console.log('Ashvault authored art data and release wiring passed.');
