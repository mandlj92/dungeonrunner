# AI Development Rules: Project DungeonRunner

## 1. Core Philosophy: "Simple Complexity"
* **Target:** A retro-style FPS (Doom/Quake) with modern Roguelite progression.
* **Golden Rule:** Keep individual systems simple, but connect them loosely. If a script exceeds **200 lines**, it is likely doing too much. Refactor immediately.
* **Performance:** Code must assume 100+ active entities. Avoid per-frame calculations (`_process`) in non-player entities whenever possible.

## 2. Architecture & Coupling (The Anti-Spaghetti Laws)

### 2.1 Composition Over Inheritance
* **Rule:** Do not create deep inheritance trees (e.g., `Enemy -> FlyingEnemy -> Bat -> FireBat`).
* **Solution:** Use **Components**.
    * Instead of `Player.gd` handling health, use a `HealthComponent` node.
    * Instead of `Enemy.gd` handling movement, use a `VelocityComponent` or `PathfindingComponent`.
    * Entities should be "containers" that glue components together.

### 2.2 Signal-Based Communication
* **Rule:** Nodes should rarely call functions on other nodes directly, especially up the tree.
* **Strict Hierarchy:**
    * **Down is Direct:** A parent can call a child's function (e.g., `Main` calls `Player.heal()`).
    * **Up is Signal:** A child MUST emit a signal to talk to a parent (e.g., `Player` emits `died`, `Main` listens and restarts game).
    * **Sideways is Bus:** Use the global `Events` autoload for communication between unrelated systems (e.g., `Enemy` emits `died`, `ScoreManager` listens).

### 2.3 No Hardcoded Paths
* **Rule:** NEVER use `load("res://path/to/scene.tscn")` inside a script logic class.
* **Solution:** Always use `@export var scene_name: PackedScene` and assign it in the Inspector. This prevents breakage if files are moved.

## 3. Godot 4.3 Specific Standards

### 3.1 Strict Typing
* **Rule:** All variables and functions must have static typing. This prevents 90% of runtime errors.
    * **Bad:** `var health = 100`
    * **Good:** `var health: int = 100`
    * **Bad:** `func take_damage(amount):`
    * **Good:** `func take_damage(amount: int) -> void:`

### 3.2 Unique Name Access
* **Rule:** Use Scene Unique Names (`%NodeName`) for accessing internal children instead of `get_node("Path/To/Node")`. This allows UI/Scene structure changes without breaking code.

### 3.3 Safe Physics
* **Rule:** Never modify `position` or `velocity` directly inside `_process`. Always use `_physics_process` for moving bodies.
* **Rule:** Mechanics affecting gameplay (Health, Ammo, cooldowns) must be frame-rate independent (always multiply by `delta`).

## 4. State & Data Management

### 4.1 Resources for Data
* **Rule:** Do not hardcode balance numbers (damage, speed, costs) in scripts.
* **Solution:** Use `Resource` files (`.tres`) for defining Enemy stats, Weapon properties, and Loot tables. This allows tweaking balance without touching code.
    * *Example:* Create an `EnemyStats` resource class instead of `export var speed = 10` in `Enemy.gd`.

### 4.2 State Machines
* **Rule:** No more `enum` combined with `match` statements inside `_physics_process` for complex AI.
* **Solution:** Use a dedicated `StateMachine` node with separate script files for each state (e.g., `EnemyIdle.gd`, `EnemyChase.gd`).

### 4.3 Global State
* **Rule:** `GameState` should only hold data that persists across runs (Coins, Unlocked Upgrades, Meta-Progression).
* **Restriction:** It should NOT handle per-run logic like "current room enemies" or "active projectiles." Keep run-specific state in `RunController`.

## 5. Visuals & "Juice" separation

### 5.1 Logic vs. Art
* **Rule:** Gameplay logic scripts (`Player.gd`, `Enemy.gd`) should not manually change Mesh colors, spawn particles, or manage audio players directly.
* **Solution:** Emit signals like `on_hit` or `on_shoot`. Connect these signals to a dedicated `VisualEffects` node or script that handles the "Juice" (screen shake, flash, sound).
    * *Violation Fix:* Move `_spawn_gibs` and `_flash_on_hit` out of `Enemy.gd` into a `EnemyVFX` component.

## 6. Testing Protocol
* **Rule:** Every major system (Inventory, Health, ProcGen) must be testable in isolation.
* **Requirement:** Create a "Debug" folder with scenes (`Debug_Combat.tscn`, `Debug_Movement.tscn`) that test *only* that feature without loading the main menu or procedural generation.