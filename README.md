# Dungeon Run: Ashvault

A complete, zero-build browser roguelite plus the original Godot prototype.

## Play the browser edition

Open `index.html` locally, or enable **Settings → Pages → GitHub Actions** for this repository. Every push to `main` then deploys the game through `.github/workflows/pages.yml`.

Expected GitHub Pages URL after Pages is enabled:

`https://mandlj92.github.io/dungeonrunner/`

## Browser game features

- Ten-chamber, five-to-ten-minute run structure
- Randomized obstacle layouts and enemy waves
- Stalker, brute, and ranged enemy archetypes
- Multi-phase Warden boss encounter
- Eleven run upgrades across common, rare, and legendary tiers
- Permanent meta-progression purchased with recovered Embers
- Persistent local high scores and run statistics
- Keyboard and mouse support
- Standard gamepad support through the browser Gamepad API
- Responsive 16:9 canvas presentation
- No dependencies, package manager, account, server, or build step

## Controls

| Action | Keyboard / Mouse | Controller |
| --- | --- | --- |
| Move | WASD | Left stick |
| Aim | Mouse | Right stick |
| Attack | Left mouse | Right trigger |
| Dash | Space | Left bumper |
| Pause | Escape | Start button support varies by browser |

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
