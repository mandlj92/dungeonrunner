# Dungeon Run: Ashvault — Pixel Art Edition

A complete, zero-build browser roguelite plus the original Godot prototype.

## Play

Live build:

`https://mandlj92.github.io/dungeonrunner/`

Every push to `main` deploys through `.github/workflows/pages.yml`.

## Build 7: branching dungeon routes

Build 7 adds a route decision after each standard chamber so every run develops differently before the fixed guardian fights in Chambers 5 and 10.

### Route types

- **Ashen Passage** — standard combat and reliable relic progress
- **Crowned Gate** — elite enemies, increased score, and bonus Embers
- **Gilded Vault** — guarded combat followed by a secret-vault chest
- **Crimson Well** — restores 28% max vitality and reduces the enemy formation
- **Cursed Shrine** — grants one of three permanent blessings with an immediate chamber curse
- **Veiled Door** — hides the chamber type until entry

Route options are generated from a run seed, avoid duplicate choices, and preserve fixed Iron Revenant and Warden gates. The route system also guarantees that a reasonable recovery option is offered before the final descent.

### Build 7 production work

- Dedicated `route-system.js` layer that extends the existing run flow without rewriting combat systems
- Deterministic three-way route generation for future seeded and daily-run support
- Route-specific enemy scaling, elite promotion, recovery, treasure, shrine, score, and Ember effects
- Offline caching and itch.io packaging for the new route asset
- CI syntax validation, release-reference checks, and route-system unit coverage

## Build 6: offline release packaging

- Offline-first service worker and installable web-app behavior
- Touch pause control and background auto-pause
- Production runtime smoke testing and diagnostic artifacts
- Packaged itch.io HTML5 artifact on every release
- Live deployment verification against the expected commit

## Build 5: mobile and production QA pass

Build 5 formats the game as a landscape-first mobile web app and tightens combat presentation.

### Mobile production work

- Safe-area support for iPhone notches, rounded corners, and the home indicator
- Correct 16:9 scaling without stretching the 320 × 180 internal render
- Landscape orientation prompt with an optional portrait override
- Fullscreen and landscape-orientation requests when a run starts
- Larger touch targets and a vertical Dash, Nova, and Swap button stack
- Clamped virtual joystick travel and visible right-stick aiming feedback
- Mobile haptics for damage, dashing, Nova, and weapon switching where supported
- Automatic pause when the browser is hidden or the app is backgrounded
- Installable fullscreen web-app manifest
- Compact menu, relic, treasure, armory, and summary layouts for short landscape displays

### Production gameplay and graphics work

- Y-sorted entities and walls for correct foreground/background occlusion
- Explicit player and enemy animation states instead of relying only on timer inference
- Wind-up frames for Shooter, Gravebinder, Warden, Stalker, and Brute attacks
- Fair melee contact attacks with visible warning boxes and cooldowns
- Corrected hit flashing without tinting nearby floor and wall pixels
- Increased Iron Revenant and Warden sprite scale with adjusted production presentation
- Larger mobile-readable health bars, controls, and combat telegraphs
- Optional collision, sprite-baseline, entity-count, and FPS overlay for QA

Append `?qa=1` to the live URL to activate the internal QA overlay:

`https://mandlj92.github.io/dungeonrunner/?qa=1`

## Pixel asset system

The browser game uses a dedicated `pixel-assets.js` library containing hand-authored raster sprites and tiles rather than geometric placeholder characters.

Implemented assets include:

- Directional player sprites with idle, walking, shooting, dashing, and hurt frames
- Directional Stalker sprites with movement, attack, and hurt frames
- Directional Brute sprites with movement, attack, and hurt frames
- Directional Shooter sprites with movement, firing, recoil, and hurt frames
- Dedicated sprites for the Vault Charger, Gravebinder, Iron Revenant, and Warden
- Three dungeon floor tiles and repeating wall tiles
- Explosive urn, treasure chest, heart, Ember, and weapon icons
- Player and enemy projectiles, impact sparks, and Ash Nova graphics
- Pixel HUD portrait, framed health and Nova meters, score panel, bounty panel, and weapon bar

The game renders internally at **320 × 180** and scales using nearest-neighbor rendering.

## Run systems

1. **Branching dungeon routes** — choose between combat, elite, treasure, healing, shrine, and mystery chambers.
2. **Three-weapon arsenal** — Cinder Pistol, Ash Scattergun, and Volt Scepter, with weapon switching and per-run weapon ranks.
3. **Elemental combat** — the pistol inflicts burn, the scattergun knocks enemies back, and the scepter chains lightning between nearby targets.
4. **Iron Revenant miniboss** — a dedicated Chamber 5 fight with telegraphed slams and radial projectile attacks.
5. **Secret treasure vaults** — guarded vault routes and Chambers 3 and 7 offer armament, vitality, or Ember rewards.
6. **Run bounties and achievements** — each run receives a scored objective worth bonus Embers, while permanent achievements track major milestones.

## Existing features

- Ten-chamber, five-to-ten-minute run structure
- Procedural obstacle layouts and enemy waves
- Stalkers, brutes, shooters, Vault Chargers, Gravebinders, shades, elites, the Iron Revenant, and the Warden
- Multi-phase Warden encounter
- Combo scoring and Ash Nova
- Blood Moon, Gilded Curse, and Veil chamber modifiers
- Destructible explosive urns
- Twelve run relics
- Permanent Ember upgrades
- Local high scores and persistent progression
- Keyboard, mouse, gamepad, and touchscreen controls
- Generated chiptune-style sound effects
- No dependencies, account, server, package manager, or build step

## Controls

| Action | Keyboard / Mouse | Controller | Touchscreen |
| --- | --- | --- | --- |
| Move | WASD | Left stick | Left virtual stick |
| Aim and attack | Mouse and left click | Right stick and right trigger | Drag on right side |
| Change weapon | E or 1–3 | X / Square | Swap button |
| Dash | Space | Left bumper | Dash button |
| Ash Nova | Q | Y / Triangle | Nova button |
| Pause | Escape | Start | Automatic when backgrounded |

## itch.io packaging

Put these files in a ZIP archive:

- `index.html`
- `styles.css`
- `manifest.webmanifest`
- `service-worker.js`
- `game-core.js`
- `game-combat.js`
- `route-system.js`
- `pixel-assets.js`
- `game-render-v4.js`
- `production-mobile.js`
- `release-enhancements.js`

Create an itch.io HTML project, upload the ZIP, select **This file will be played in the browser**, use a 16:9 viewport such as 1280 × 720, and allow fullscreen.

Progress is stored in the browser using `localStorage`. Each browser profile has its own armory, achievements, and scoreboard.

## Original Godot project

The repository also retains the earlier Godot 4.3 prototype:

- Main scene: `res://scenes/main.tscn`
- Run scene: `res://scenes/world/run.tscn`
- Global state: `res://scripts/game_state.gd`

Open the repository in Godot 4.3 and press Play to run that edition.
