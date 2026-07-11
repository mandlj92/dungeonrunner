'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const elements = new Map();
class FakeElement {
  constructor() {
    this.innerHTML = '';
    this.dataset = {};
    this.classList = { remove() {}, add() {}, toggle() {} };
    this.onclick = null;
  }
}

const sandbox = {
  console,
  Date,
  Math,
  window: null,
  document: {
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, new FakeElement());
      return elements.get(selector);
    },
    querySelectorAll() { return []; }
  },
  roomNo: 0,
  state: 'menu',
  player: { hp: 100, maxHp: 100, baseDamage: 18, armor: 0 },
  room: null,
  enemies: [],
  runEmbers: 0,
  score: 0,
  resetRun() { sandbox.roomNo = 0; sandbox.nextRoom(); sandbox.state = 'playing'; },
  nextRoom() { sandbox.roomNo++; sandbox.room = sandbox.generateRoom(); sandbox.spawnWave(); },
  generateRoom() { return { mod: { hp: 1, damage: 1, score: 1 }, obs: [], cleared: false }; },
  spawnWave() { sandbox.enemies = [{ type: 'stalker', x: 10, y: 10 }]; },
  makeEnemy(type, x, y, elite) { return { type, x, y, elite: !!elite }; },
  roomComplete() {},
  showRelicChoice() {},
  showTreasure() {},
  endRun() {},
  pickUpgrades() { return []; },
  show() {},
  toast() {},
  $: (selector) => sandbox.document.querySelector(selector)
};
sandbox.window = sandbox;

const context = vm.createContext(sandbox);
const source = fs.readFileSync(require.resolve('../route-system.js'), 'utf8');
vm.runInContext(source, context, { filename: 'route-system.js' });

assert.equal(typeof sandbox.AshvaultRoutes, 'object');
assert.equal(Object.keys(sandbox.AshvaultRoutes.definitions).length, 7);

sandbox.resetRun();
assert.equal(sandbox.roomNo, 1);
assert.equal(sandbox.AshvaultRoutes.current.id, 'combat');
assert.equal(sandbox.AshvaultRoutes.path.length, 1);

const preview = sandbox.AshvaultRoutes.preview(2);
assert.equal(preview.length, 3);
assert.equal(new Set(preview.map((route) => route.id)).size, 3);
assert.ok(preview.some((route) => ['combat', 'healing', 'treasure'].includes(route.id)));

console.log('Ashvault route-system test passed.');
