# Dungeon Run: Ashvault

A complete, zero-build browser roguelite plus the original Godot prototype.

## Play the browser edition

Live build:

`https://mandlj92.github.io/dungeonrunner/`

Every push to `main` deploys through `.github/workflows/pages.yml`.

## Browser game features

- Ten-chamber, five-to-ten-minute run structure
- Randomized obstacle layouts and enemy waves
- Seven enemy types: stalker, brute, shooter, Vault Charger, Gravebinder, summoned shades, and the Warden
- Multi-phase Warden boss encounter
- Telegraphed charge attacks and enemy summoning
- Combo scoring with escalating score multipliers
- Charged Ash Nova screen-clearing ability
- Random chamber modifiers: Blood Moon, Gilded Curse, and The Veil
- Shielded elite enemies with increased rewards
- Destructible explosive urns and environmental chain damage
- Twelve run upgrades across common, rare, and legendary tiers
- Permanent meta-progression purchased with recovered Embers
- Persistent local high scores and run statistics
- Keyboard, mouse, gamepad, and touchscreen support
- Procedural audio effects generated in the browser
- Dynamic lighting, shadows, animated runes, projectile trails, damage numbers, particles, and screen effects
- Responsive 16:9 canvas presentation
- No dependencies, package manager, account, server, or build step

## Controls

| Action | Keyboard / Mouse | Controller | Touchscreen |
| --- | --- | --- | --- |
| Move | WASD | Left stick | Left virtual stick |
| Aim and attack | Mouse and left click | Right stick and right trigger | Drag on right side |
| Dash | Space | Left bumper | Dash button |
| Ash Nova | Q | Y / Triangle | Nova button |
| Pause | Escape | Start | Browser controls |

Ash Nova charges through enemy kills. Elite enemies charge it faster.

## itch.io packaging

1. Put `index.html`, `styles.css`, and `game.js` in a ZIP archive.
2. Create a new itch.io project and set **Kind of project** to **HTML**.
3. Upload the ZIP and select **This file will be played in the browser**.
4. Use a 16:9 viewport such as 1280 × 720 and allow fullscreen.

Progress is stored in the browser using `localStorage`. Each browser/profile therefore has its own armory and scoreboard.

## Original Godot project

The repository also retains the earlier Godot 4.3 prototype:

- Main scene: `res://scenes/main.tscn`
- Run scene: `res://scenes/world/run.tscn`
- Global state: `res://scripts/game_state.gd`

Open the repository in Godot 4.3 and press Play to run that edition.
