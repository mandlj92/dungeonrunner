Dungeon Run
=============

Short summary of the Godot project in this repository.

**Project**
- **Engine:** Godot 4.3 (project.godot config indicates 4.3 features)
- **Main scene:** `res://scenes/main.tscn`
- **Autoloads:** `GameState` -> `res://scripts/game_state.gd`

What this is
------------
- A small top-down/3D-ish roguelike-ish run-based prototype.
- Core flow: Main Menu -> Shop -> Start Run (loads `scenes/world/run.tscn`) -> complete run -> Summary

Key scenes
-----------
- `scenes/main.tscn` — Main menu
- `scenes/ui/shop.tscn` — Upgrade shop and run starter
- `scenes/world/run.tscn` — Run controller and generated rooms
- `scenes/world/Room.tscn` — Room template used by procgen
- `scenes/player/Player.tscn` — Player character
- `scenes/enemies/enemy.tscn` — Enemy template
- `scenes/projectile.tscn` — Projectile used by player
- `scenes/pickups/ammo_pickup.tscn` — Pickup template
- `scenes/ui/HUD.tscn`, `scenes/ui/pause_menu.tscn`, `scenes/summary.tscn`

Key scripts (high-level)
------------------------
- `scripts/game_state.gd` — Global autoload for coins, upgrades and run seed
- `scripts/world/procgen.gd` — Procedural room placement helper
- `scripts/world/run_controller.gd` — Orchestrates run generation and spawns
- `scripts/player/player.gd` — Player movement, input, firing and HUD interaction
- `scripts/enemies/enemy.gd` — Basic navigation and attack AI
- `scripts/projectile.gd` — Projectile movement and hit handling
- `scripts/pickups/pickup.gd` — Pickup behavior
- `scripts/ui/*.gd` — Menu, shop, HUD and summary UI glue

Known issues / things to verify
------------------------------
- `run_controller` exports a `portal_scene` PackedScene which is not assigned in `run.tscn` in the current repo — confirm in-editor assignment.
- The `assets/` folder appears present but scenes/scripts do not currently reference external textures/VFX — verify asset imports and references.
- Pause menu is instantiated at runtime by the player script (expected but note behaviour).

How to run
----------
1. Open this folder in Godot 4.3 and press Play (Main scene is `res://scenes/main.tscn`).
2. Alternatively, use a Godot 4.3 CLI to run or export the project.

Asset scanner
-------------
- A small utility `tools/scan_assets.py` is included to list referenced resources and report unreferenced files in `assets/`.

Next steps I can do for you
--------------------------
- Run the asset scanner and report results.
- Create a `docs/SUMMARY.md` with the full detailed mapping of every scene/script.
- Patch `run_controller` or assign missing PackedScenes if you want me to make editor-safe changes.

---
Generated: January 2026
