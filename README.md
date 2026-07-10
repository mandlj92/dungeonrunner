# Dungeon Run: Ashvault — GBA Edition

A complete, zero-build browser roguelite plus the original Godot prototype.

## Play

Live build:

`https://mandlj92.github.io/dungeonrunner/`

Every push to `main` deploys through `.github/workflows/pages.yml`.

## GBA Edition

The browser game now renders internally at **320 × 180** and scales to the display with nearest-neighbor rendering. The visual language uses a restricted handheld-era palette, tiled floors, hard pixel shadows, hand-drawn pixel sprites, low-resolution effects, bitmap-style HUD elements, and pixel-framed menus.

## New systems in Build 3

1. **Three-weapon arsenal** — Cinder Pistol, Ash Scattergun, and Volt Scepter, with weapon switching and per-run weapon ranks.
2. **Elemental combat** — the pistol inflicts burn, the scattergun knocks enemies back, and the scepter chains lightning between nearby targets.
3. **Iron Revenant miniboss** — a dedicated Chamber 5 fight with telegraphed slams and radial projectile attacks.
4. **Secret treasure vaults** — Chambers 3 and 7 offer armament, vitality, or Ember rewards before the normal relic choice.
5. **Run bounties and achievements** — each run receives a scored objective worth bonus Embers, while permanent achievements track major milestones.

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
| Pause | Escape | Start | Browser controls |

## itch.io packaging

Put these files in a ZIP archive:

- `index.html`
- `styles.css`
- `game-core.js`
- `game-combat.js`
- `game-render.js`

Create an itch.io HTML project, upload the ZIP, select **This file will be played in the browser**, use a 16:9 viewport such as 1280 × 720, and allow fullscreen.

Progress is stored in the browser using `localStorage`. Each browser profile has its own armory, achievements, and scoreboard.

## Original Godot project

The repository also retains the earlier Godot 4.3 prototype:

- Main scene: `res://scenes/main.tscn`
- Run scene: `res://scenes/world/run.tscn`
- Global state: `res://scripts/game_state.gd`

Open the repository in Godot 4.3 and press Play to run that edition.
