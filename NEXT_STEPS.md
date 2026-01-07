# Development Roadmap: Next Steps

**Status:** Visual Polish Complete | Core Features In Progress
**Last Updated:** 2026-01-07

This document outlines the next major development tasks following the completion of visual polish features. All implementations will adhere to [RULES.md](RULES.md) architecture guidelines.

---

## ✅ Recently Completed

### Visual Polish (Phase 1) - DONE
- ✅ HUD Health Bar with tween animation
- ✅ Dynamic Crosshair expansion on fire
- ✅ Enemy Hit Flash Component
- ✅ Sprint FOV camera feedback
- ✅ VFXComponent and CameraVFX foundation

---

## 🔄 Phase 2: Complete Upgrade System

**Goal:** Finish implementing stubbed upgrades and ensure system scalability.

### Task A: Complete Dash Attack Upgrade
**Status:** 🔧 Partially Implemented
**Priority:** High
**Estimated Complexity:** Medium (~2 hours)

**Current State:**
- File exists: `scripts/upgrades/dash_attack.gd`
- Has basic structure with damage/knockback exports
- Missing: Collision area setup (`_setup_dash_area()` incomplete)
- Missing: Sprint signal connection

**Implementation Steps:**

1. **Complete `_setup_dash_area()` function**
   - Create Area3D node as child of player
   - Set collision layer/mask appropriately
   - Connect to `body_entered` signal

2. **Wire up sprint detection**
   - Connect to Player's `sprinting_started` signal
   - Track sprinting state for damage eligibility

3. **Implement cooldown system**
   - Ensure enemies can only be damaged once per cooldown
   - Clear `_damaged_enemies` dictionary periodically

**Reference Implementation:**
```gdscript
func _setup_dash_area() -> void:
    var area = Area3D.new()
    area.name = "DashArea"
    area.collision_layer = 0
    area.collision_mask = 2  # Enemy layer

    var collision_shape = CollisionShape3D.new()
    var shape = SphereShape3D.new()
    shape.radius = 1.5
    collision_shape.shape = shape

    area.add_child(collision_shape)
    owner_entity.add_child(area)
    area.body_entered.connect(_on_body_entered_dash_area)
```

**Architecture Compliance:**
- ✅ Rule 2.2: Signal-based (connects to sprint signals)
- ✅ Rule 3.1: Strict typing (int, float, Dictionary)
- ✅ Rule 5.1: Upgrade logic separated from Player.gd

---

### Task B: Complete Vampire Bullets Upgrade
**Status:** 🔧 Partially Implemented
**Priority:** High
**Estimated Complexity:** Low (~30 minutes)

**Current State:**
- File exists: `scripts/upgrades/vampire_bullets.gd`
- Basic structure complete
- Connects to `Events.enemy_shot` signal ✓
- Healing logic implemented ✓

**Implementation Steps:**

1. **Verify signal emission**
   - Ensure `Events.enemy_shot` is emitted when projectile hits enemy
   - Check `scripts/projectile.gd` for emission point

2. **Test integration**
   - Apply upgrade to player
   - Shoot enemy and verify healing occurs

**Potential Issues:**
- If `Events.enemy_shot` isn't emitted, need to add it to projectile hit logic
- Check if signal passes enemy reference correctly

---

## 🔄 Phase 3: Procedural Generation Enhancements

**Goal:** Add variety to room generation and enemy spawning.

### Task D: Enemy Variety System
**Status:** 📋 Not Started
**Priority:** High
**Estimated Complexity:** High (~4-5 hours)

**Current State:**
- Single enemy type exists (`scenes/enemies/enemy.tscn`)
- Uses EnemyStats resource (✓ following Rule 4.1)
- Room spawning logic in `scripts/world/room.gd`

**Implementation Steps:**

1. **Create enemy variants using Resources**
   ```
   resources/enemies/
   ├── basic_enemy_stats.tres (exists)
   ├── fast_enemy_stats.tres (new - high speed, low HP)
   ├── tank_enemy_stats.tres (new - low speed, high HP)
   └── ranged_enemy_stats.tres (new - shoots back!)
   ```

2. **Create ranged enemy scene**
   - Duplicate `enemy.tscn` → `ranged_enemy.tscn`
   - Add WeaponController component
   - Implement AI to shoot at player from distance

3. **Update Room spawning logic**
   - `scripts/world/room.gd`: Add enemy pool array
   - Randomly select enemy type per spawn point
   - Balance enemy counts based on difficulty

4. **Implement difficulty scaling**
   - Increase enemy stats per room depth
   - Mix enemy types for challenge variety

**Architecture Compliance:**
- ✅ Rule 2.1: Use components (WeaponController for ranged)
- ✅ Rule 4.1: Stats in Resources (easy balance tweaking)
- ✅ Rule 5.1: Keep enemy.gd under 200 lines

---

### Task E: Room Layout Variety
**Status:** 📋 Not Started
**Priority:** Medium
**Estimated Complexity:** High (~5-6 hours)

**Current State:**
- Basic room generation in `scripts/world/procgen.gd`
- Single Room.tscn template
- Corridors connect rooms

**Implementation Steps:**

1. **Create room templates**
   - `Room_Arena.tscn` - Large open space, many enemies
   - `Room_Narrow.tscn` - Corridor-like, ambush enemies
   - `Room_Pillars.tscn` - Cover mechanics, strategic combat
   - `Room_MultiLevel.tscn` - Platforms/height variation

2. **Tag rooms with metadata**
   ```gdscript
   # In room scene root node
   @export var room_type: String = "arena"  # arena, narrow, pillars, multilevel
   @export var difficulty: int = 1  # 1=easy, 3=hard
   @export var spawn_points: Array[Marker3D]  # Enemy spawn locations
   ```

3. **Update ProcGen to use templates**
   - Load room templates from pool
   - Select based on run depth (harder rooms deeper)
   - Ensure variety (don't repeat same room type)

4. **Add environmental hazards (optional)**
   - Lava/spike areas that damage player
   - Moving platforms
   - Breakable walls

**Architecture Compliance:**
- ✅ Rule 2.3: Use PackedScene exports, not hardcoded paths
- ✅ Rule 4.1: Room metadata as exports for easy tweaking

---

## 🔄 Phase 4: Balance & Polish Pass

**Goal:** Use the new Resource system for systematic balance tuning.

### Task F: Create Balance Dashboard
**Status:** 📋 Not Started
**Priority:** Medium
**Estimated Complexity:** Low (~1-2 hours)

**Implementation:**

1. **Centralize all balance Resources**
   ```
   resources/
   ├── enemies/
   │   ├── basic_enemy_stats.tres
   │   ├── fast_enemy_stats.tres
   │   └── tank_enemy_stats.tres
   ├── weapons/
   │   ├── default_weapon_stats.tres
   │   └── upgraded_weapon_stats.tres (for future weapon tiers)
   └── balance/
       └── game_balance.tres (new - global values)
   ```

2. **Create GameBalance resource**
   ```gdscript
   # scripts/resources/game_balance.gd
   class_name GameBalance
   extends Resource

   @export var player_base_health := 100
   @export var player_base_speed := 6.0
   @export var difficulty_scale_per_room := 1.15
   @export var coin_drop_chance := 0.3
   @export var upgrade_cost_multiplier := 1.5
   ```

3. **Update Player/Enemy to reference GameBalance**
   - Load balance resource in GameState autoload
   - Reference via `GameState.balance.player_base_health`

**Benefits:**
- ✅ No code changes needed for balance tweaks
- ✅ Can create "Easy" vs "Hard" mode resource variants
- ✅ Follows Rule 4.1 (Resources for Data)

---

### Task G: Playtesting & Iteration
**Status:** 📋 Not Started
**Priority:** High (after Phases 2-3)
**Estimated Complexity:** Ongoing

**Testing Protocol:**

1. **Combat Balance**
   - Time-to-kill for each enemy type
   - Player survivability at different depths
   - Upgrade power scaling

2. **Room Difficulty**
   - Are rooms too easy/hard at depth X?
   - Is enemy variety interesting?
   - Are room layouts fun to navigate?

3. **Progression Feel**
   - Does player feel stronger with upgrades?
   - Is upgrade choice meaningful?
   - Are runs too short/long?

**Data to Track:**
- Average run time
- Common death causes
- Most/least picked upgrades
- Room depth achieved

---

## 🔄 Phase 5: Audio & Juice

**Goal:** Add sound effects and music to enhance feedback.

### Task H: Sound Effects Integration
**Status:** 📋 Not Started
**Priority:** Medium
**Estimated Complexity:** Medium (~3-4 hours)

**Required Sounds:**
- Player gun shoot
- Enemy hit/death
- Player damage/death
- UI clicks
- Footsteps
- Dash whoosh
- Health pickup
- Portal activate

**Implementation:**

1. **Create SFXManager autoload**
   - Manages audio pools (prevent overlapping spam)
   - Plays one-shot sounds
   - Handles spatial audio for 3D sounds

2. **Add AudioStreamPlayer nodes to VFXComponent**
   - `scripts/components/vfx_component.gd` already exists
   - Add `@export var sfx_library: Dictionary` for sound mapping
   - Play sounds on damage/death events

3. **Wire up UI sounds**
   - Button clicks
   - Upgrade purchase confirmation

**Architecture Compliance:**
- ✅ Rule 5.1: Audio in VFXComponent, not gameplay logic
- ✅ Rule 2.2: Triggered by signals

---

### Task I: Music System
**Status:** 📋 Not Started
**Priority:** Low
**Estimated Complexity:** Low (~1-2 hours)

**Implementation:**

1. **Create MusicManager autoload**
   - Crossfade between tracks
   - Combat intensity layers (calm → intense)

2. **Music tracks needed**
   - Menu theme
   - Exploration ambient
   - Combat loop (can layer intensity)
   - Boss theme (if boss added)

3. **Dynamic music**
   - Increase intensity when enemies nearby
   - Calm down when room clear

---

## 🎯 Priority Summary

**Immediate (This Week):**
1. ✅ Complete visual polish (DONE)
2. 🔧 Task A: Complete Dash Attack
3. 🔧 Task B: Complete Vampire Bullets

**Short-term (Next Week):**
4. 📋 Task D: Enemy Variety System
5. 📋 Task C: Create 2-3 new upgrades
6. 📋 Task F: Balance Dashboard

**Mid-term (2-3 Weeks):**
7. 📋 Task E: Room Layout Variety
8. 📋 Task G: Playtesting pass
9. 📋 Task H: Sound Effects

**Long-term (1 Month+):**
10. 📋 Task I: Music System
11. 📋 Boss enemy design
12. 📋 Meta-progression (persistent upgrades between runs)

---

## Architecture Checklist for New Features

Before implementing any task, ensure:
- [ ] Script stays under 200 lines (Rule 1)
- [ ] Uses composition over inheritance (Rule 2.1)
- [ ] Signals for communication, not direct calls (Rule 2.2)
- [ ] No hardcoded paths, use @export (Rule 2.3)
- [ ] All variables strictly typed (Rule 3.1)
- [ ] Use Scene Unique Names (%) where applicable (Rule 3.2)
- [ ] Physics in _physics_process (Rule 3.3)
- [ ] Balance data in Resources (Rule 4.1)
- [ ] Visual effects separated from logic (Rule 5.1)
- [ ] Debug scene exists for isolated testing (Rule 6)

---

## Related Files

- [RULES.md](RULES.md) - Architecture guidelines (MUST READ)
- [VISUAL_ROADMAP.md](VISUAL_ROADMAP.md) - Completed visual polish tasks
- [scripts/upgrades/upgrade_effect.gd](scripts/upgrades/upgrade_effect.gd) - Base class for upgrades
- [scripts/resources/enemy_stats.gd](scripts/resources/enemy_stats.gd) - Enemy data structure
- [scripts/world/procgen.gd](scripts/world/procgen.gd) - Room generation logic

---

**Document Version:** 1.0
**Next Review:** After Phase 2 completion
