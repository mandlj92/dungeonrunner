# Next Steps - Integration Guide

## Immediate Actions Required

### 1. Update Player Scene
You need to manually add the component nodes to your Player.tscn scene in Godot:

```
Player (CharacterBody3D)
├── Head
│   ├── Camera3D
│   └── RayCast3D
├── HealthComponent (NEW - Add this!)
├── WeaponController (NEW - Add this!)
└── MeleeController (NEW - Add this!)
```

**How to do this:**
1. Open `scenes/player/Player.tscn` in Godot
2. Right-click on Player node → Add Child Node
3. Search for "Node" → Add it → Rename to "HealthComponent"
4. In Inspector, attach script: `res://scripts/components/health_component.gd`
5. Set exports:
   - max_health: 100
   - invulnerability_time: 0.6
   - knockback_strength: 7.0

6. Repeat for WeaponController:
   - Attach: `res://scripts/components/weapon_controller.gd`
   - Set projectile_scene, shoot_sfx exports (from old player settings)

7. Repeat for MeleeController:
   - Attach: `res://scripts/components/melee_controller.gd`
   - Set hit_sfx export

### 2. Update ProcGen Node
In your main scene or run controller:
1. Find the ProcGen node
2. In Inspector, set the new export:
   - connector_scene: `res://scenes/world/Connector.tscn`

### 3. Remove Old MeleeArea from Player
The old `MeleeArea` (Area3D) is no longer needed:
1. Open Player.tscn
2. Delete the `MeleeArea` node
3. MeleeController creates its own ShapeCast3D internally

### 4. Test Save Compatibility
Since we added encryption, you may need to:
- Delete old save files: `user://save_game.cfg`
- OR: The system will auto-fallback to unencrypted for old saves

---

## Optional: Enable Behavioral Upgrades

### Add UpgradeManager to Player
```
Player (CharacterBody3D)
├── HealthComponent
├── WeaponController
├── MeleeController
└── UpgradeManager (OPTIONAL - Add for behavioral upgrades)
```

Attach script: `res://scripts/upgrades/upgrade_manager.gd`

### Update Shop to Support Behavioral Upgrades

In `scripts/ui/shop.gd`, when player buys an upgrade:

```gdscript
func purchase_upgrade(upgrade_type: GameState.UpgradeType) -> void:
    if GameState.spend_coins(cost):
        GameState.upgrades[upgrade_type] += 1

        # NEW: Apply behavioral upgrades
        if GameState.is_behavioral_upgrade(upgrade_type):
            var player = get_tree().get_first_node_in_group("player")
            if player and player.has_node("UpgradeManager"):
                var upgrade_manager = player.get_node("UpgradeManager")
                var upgrade_script = GameState.get_upgrade_script(upgrade_type)
                if upgrade_script:
                    upgrade_manager.add_upgrade(upgrade_script)
```

---

## Testing

### Critical Tests
1. **Health System**: Take damage → Should see health bar update
2. **Weapon System**: Fire gun → Should see muzzle flash (no lag)
3. **Melee System**: Attack enemy → Should reliably hit (100% accuracy)
4. **Save System**: Save game → Close → Reopen → Load (should work)
5. **Procgen**: Start run → Rooms should have connectors between them

### Upgrade Tests (If you added UpgradeManager)
1. Add Fire Trail upgrade in shop
2. Buy it
3. Sprint → Should see fire trail behind player

---

## Known Issues & Workarounds

### Issue: "Invalid get index 'HealthComponent'"
**Cause**: Player.tscn doesn't have the component nodes yet
**Fix**: Follow "Update Player Scene" steps above

### Issue: "Connector scene not set"
**Cause**: ProcGen node missing connector_scene export
**Fix**: Set to `res://scenes/world/Connector.tscn`

### Issue: Melee not working
**Cause**: ShapeCast3D collision mask might be wrong
**Fix**: In MeleeController, the collision_mask is set to 2 (enemy layer). Verify enemies are on layer 2.

---

## Future Enhancements

### Short Term (Milestone 3)
- [ ] Implement Vampire Bullets upgrade
- [ ] Implement Dash Attack upgrade
- [ ] Add projectile pierce support for Piercing Rounds
- [ ] Create upgrade selection UI (show descriptions)

### Medium Term
- [ ] Apply HealthComponent to enemies
- [ ] Create boss-specific upgrades
- [ ] Add upgrade preview/demo system

### Long Term
- [ ] Synergies between upgrades
- [ ] Upgrade tiers (Common/Rare/Legendary)
- [ ] Run-specific temporary upgrades

---

## Rollback Plan

If something breaks critically:
1. Revert `scripts/player/player.gd` to old version
2. Keep component scripts (they're independent)
3. Gradually re-integrate one component at a time

---

## Questions?

If you encounter issues:
1. Check console for errors (especially missing node references)
2. Verify all exports are set in Inspector
3. Make sure collision layers match (Player: 1, Enemies: 2)

**Common Error**: `get_node: Node not found: "HealthComponent"`
→ You forgot to add the component to Player.tscn

---

Good luck! The architecture is now production-ready. 🚀
