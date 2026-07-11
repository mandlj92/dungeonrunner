'use strict';

(() => {
  const ROUTES = Object.freeze({
    combat: {
      id: 'combat',
      name: 'ASHEN PASSAGE',
      tag: 'STANDARD',
      desc: 'A balanced combat chamber with normal enemy pressure.',
      reward: 'Reliable relic progress.'
    },
    elite: {
      id: 'elite',
      name: 'CROWNED GATE',
      tag: 'HIGH RISK',
      desc: 'Empowered enemies guard a richer Ember cache.',
      reward: 'Bonus score and Embers.'
    },
    treasure: {
      id: 'treasure',
      name: 'GILDED VAULT',
      tag: 'REWARD',
      desc: 'Fight through a guarded cache and claim a secret-vault chest.',
      reward: 'Armament, vitality, or Embers.'
    },
    healing: {
      id: 'healing',
      name: 'CRIMSON WELL',
      tag: 'RECOVERY',
      desc: 'Recover vitality before facing a reduced enemy formation.',
      reward: 'Restore 28% max vitality.'
    },
    shrine: {
      id: 'shrine',
      name: 'CURSED SHRINE',
      tag: 'BARGAIN',
      desc: 'Accept a permanent blessing and survive its chamber curse.',
      reward: 'A run-long boon with immediate danger.'
    },
    mystery: {
      id: 'mystery',
      name: 'VEILED DOOR',
      tag: 'UNKNOWN',
      desc: 'The chamber type is hidden until the threshold is crossed.',
      reward: 'Risk and reward concealed.'
    },
    boss: {
      id: 'boss',
      name: 'IRON GATE',
      tag: 'BOSS',
      desc: 'A fixed guardian blocks the descent.',
      reward: 'Break the gatekeeper.'
    }
  });

  const SHRINES = Object.freeze([
    {
      id: 'blood',
      name: 'BLOOD ALTAR',
      text: '+12% weapon damage. Enemies here gain 25% vitality.',
      apply(route) {
        player.baseDamage *= 1.12;
        route.enemyHp = 1.25;
      }
    },
    {
      id: 'iron',
      name: 'IRON VOW',
      text: '+2 armor. Enemies here deal 15% more damage.',
      apply(route) {
        player.armor += 2;
        route.enemyDamage = 1.15;
      }
    },
    {
      id: 'ember',
      name: 'EMBER COVENANT',
      text: '+8 Embers. Lose 12 current vitality; enemies gain 10% vitality.',
      apply(route) {
        runEmbers += 8;
        player.hp = Math.max(1, player.hp - 12);
        route.enemyHp = 1.1;
      }
    }
  ]);

  let runSeed = 1;
  let pendingRoute = null;
  let currentRoute = null;
  let routeHistory = [];
  let recoveryOffered = false;

  const baseResetRun = resetRun;
  const baseNextRoom = nextRoom;
  const baseGenerateRoom = generateRoom;
  const baseSpawnWave = spawnWave;

  function hash(seed, salt) {
    let value = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
    value ^= value >>> 16;
    value = Math.imul(value, 0x7feb352d);
    value ^= value >>> 15;
    value = Math.imul(value, 0x846ca68b);
    value ^= value >>> 16;
    return value >>> 0;
  }

  function seededIndex(length, salt) {
    return length ? hash(runSeed, salt) % length : 0;
  }

  function deterministicOrder(items, salt) {
    return [...items]
      .map((item, index) => ({ item, rank: hash(runSeed, salt + index * 17) }))
      .sort((a, b) => a.rank - b.rank)
      .map(({ item }) => item);
  }

  function routeOptions(nextChamber) {
    const pool = ['combat', 'elite', 'treasure', 'healing', 'shrine', 'mystery'];
    const ordered = deterministicOrder(pool, nextChamber * 101);
    const choices = [];

    const previous = routeHistory.at(-1)?.id;
    const standard = ordered.find((id) => id === 'combat' || id === 'healing' || id === 'treasure');
    if (standard) choices.push(standard);

    for (const id of ordered) {
      if (choices.length >= 3) break;
      if (id === previous || choices.includes(id)) continue;
      choices.push(id);
    }

    const mustOfferRecovery = nextChamber >= 8 && !recoveryOffered;
    if (mustOfferRecovery && !choices.some((id) => id === 'healing' || id === 'treasure')) {
      choices[choices.length - 1] = 'healing';
    }

    return choices.slice(0, 3);
  }

  function materializeRoute(id, chamber, optionIndex = 0) {
    let resolvedId = id;
    let hiddenFrom = null;

    if (id === 'mystery') {
      const outcomes = ['combat', 'elite', 'treasure', 'healing', 'shrine'];
      resolvedId = outcomes[seededIndex(outcomes.length, chamber * 211 + optionIndex)];
      hiddenFrom = 'mystery';
    }

    const route = { ...ROUTES[resolvedId], chamber, hiddenFrom };
    if (resolvedId === 'shrine') {
      route.shrine = SHRINES[seededIndex(SHRINES.length, chamber * 307 + optionIndex)];
    }
    return route;
  }

  function applyEntryEffect(route) {
    if (!player || !route) return;

    if (route.id === 'healing') {
      const restored = Math.max(1, Math.ceil(player.maxHp * 0.28));
      player.hp = Math.min(player.maxHp, player.hp + restored);
      toast(`CRIMSON WELL · +${restored} VITALITY`);
    }

    if (route.id === 'shrine' && route.shrine) {
      route.shrine.apply(route);
      toast(`${route.shrine.name} · ${route.shrine.text}`);
    }

    if (route.hiddenFrom === 'mystery') {
      toast(`THE VEIL LIFTS · ${route.name}`);
    }
  }

  function applyRoomScaling(generated) {
    if (!currentRoute || currentRoute.id === 'boss') return generated;
    const hpScale = currentRoute.enemyHp || (currentRoute.id === 'healing' ? 0.82 : 1);
    const damageScale = currentRoute.enemyDamage || 1;
    const scoreScale = currentRoute.id === 'elite' ? 1.18 : currentRoute.id === 'healing' ? 0.9 : 1;

    generated.mod = {
      ...generated.mod,
      hp: generated.mod.hp * hpScale,
      damage: generated.mod.damage * damageScale,
      score: generated.mod.score * scoreScale
    };
    generated.route = currentRoute;
    return generated;
  }

  function applyWaveRules() {
    if (!currentRoute || currentRoute.id === 'boss' || roomNo === 5 || roomNo === 10) return;

    if (currentRoute.id === 'elite') {
      const eliteCount = roomNo >= 7 ? 2 : 1;
      for (let i = 0; i < Math.min(eliteCount, enemies.length); i++) {
        const enemy = enemies[i];
        enemies[i] = makeEnemy(enemy.type, enemy.x, enemy.y, true);
      }
    }

    if ((currentRoute.id === 'healing' || currentRoute.id === 'treasure') && enemies.length > 4) {
      enemies.pop();
    }
  }

  function grantRouteClearReward() {
    if (!currentRoute) return;
    if (currentRoute.id === 'elite') {
      const emberReward = 6 + Math.floor(roomNo / 2);
      runEmbers += emberReward;
      score += roomNo * 175;
      toast(`CROWNED GATE CLEARED · +${emberReward} EMBERS`);
    }
    if (currentRoute.id === 'shrine') {
      runEmbers += 3;
    }
  }

  function enterNextRoom() {
    const nextChamber = roomNo + 1;
    if (nextChamber === 5 || nextChamber === 10) {
      currentRoute = { ...ROUTES.boss, chamber: nextChamber };
    } else {
      currentRoute = pendingRoute || materializeRoute('combat', nextChamber);
    }
    pendingRoute = null;
    applyEntryEffect(currentRoute);
    baseNextRoom();
    routeHistory.push({ chamber: roomNo, id: currentRoute.id, name: currentRoute.name, hiddenFrom: currentRoute.hiddenFrom });
    if (currentRoute.id !== 'boss') toast(`${currentRoute.name} · CHAMBER ${roomNo}`);
  }

  function offerNextRoute() {
    const nextChamber = roomNo + 1;
    if (nextChamber === 5 || nextChamber === 10) {
      state = 'playing';
      enterNextRoom();
      return;
    }

    const choices = routeOptions(nextChamber);
    if (choices.some((id) => id === 'healing' || id === 'treasure')) recoveryOffered = true;

    $('#choice').innerHTML = `<p class="eyebrow">THE VAULT FORKS</p><h2>CHOOSE YOUR DESCENT</h2><p class="route-seed">RUN ${runSeed.toString(16).toUpperCase().padStart(8, '0')} · NEXT CHAMBER ${nextChamber}</p><div class="cards">${choices.map((id, index) => {
      const route = ROUTES[id];
      return `<button class="card" data-route="${id}" data-route-index="${index}"><span class="tag">${route.tag}</span><h3>${route.name}</h3><p>${route.desc}</p><p class="route-reward">${route.reward}</p></button>`;
    }).join('')}</div>`;
    show('choice');
    state = 'route';

    document.querySelectorAll('[data-route]').forEach((button) => {
      button.onclick = () => {
        pendingRoute = materializeRoute(button.dataset.route, nextChamber, Number(button.dataset.routeIndex || 0));
        $('#choice').classList.remove('visible');
        state = 'playing';
        enterNextRoom();
      };
    });
  }

  resetRun = function routeResetRun() {
    runSeed = ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) || 1;
    pendingRoute = materializeRoute('combat', 1);
    currentRoute = null;
    routeHistory = [];
    recoveryOffered = false;
    baseResetRun();
  };

  nextRoom = enterNextRoom;

  generateRoom = function routeGenerateRoom() {
    return applyRoomScaling(baseGenerateRoom());
  };

  spawnWave = function routeSpawnWave() {
    baseSpawnWave();
    applyWaveRules();
  };

  roomComplete = function routeRoomComplete() {
    if (state !== 'playing') return;
    if (roomNo === 10) {
      endRun(true);
      return;
    }

    grantRouteClearReward();
    const continueFlow = () => showRelicChoice();
    if (currentRoute?.id === 'treasure' || roomNo === 3 || roomNo === 7) showTreasure(continueFlow);
    else continueFlow();
  };

  showRelicChoice = function routeRelicChoice() {
    const choices = pickUpgrades(3);
    $('#choice').innerHTML = `<p class="eyebrow">CHAMBER CLEARED</p><h2>CHOOSE A RELIC</h2><div class="cards">${choices.map((upgrade, index) => `<button class="card" data-up="${index}"><span class="tag">${upgrade.rarity}</span><h3>${upgrade.name}</h3><p>${upgrade.desc}</p></button>`).join('')}</div>`;
    show('choice');
    state = 'choice';
    document.querySelectorAll('[data-up]').forEach((button) => {
      button.onclick = () => {
        choices[Number(button.dataset.up)].apply();
        $('#choice').classList.remove('visible');
        state = 'playing';
        offerNextRoute();
      };
    });
  };

  window.AshvaultRoutes = Object.freeze({
    definitions: ROUTES,
    preview(nextChamber) {
      return routeOptions(nextChamber).map((id) => ROUTES[id]);
    },
    get seed() { return runSeed; },
    get current() { return currentRoute ? { ...currentRoute } : null; },
    get path() { return routeHistory.map((entry) => ({ ...entry })); }
  });
})();
