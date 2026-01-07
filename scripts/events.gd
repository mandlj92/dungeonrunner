extends Node

# Event Bus for global game events
# Register this as an Autoload named "Events" in Project Settings

# Projectile spawning
@warning_ignore("unused_signal")
signal spawn_projectile(scene: PackedScene, spawn_transform: Transform3D, damage: int, shooter: Node)

# Player health events
@warning_ignore("unused_signal")
signal player_health_changed(current: int, max: int)
@warning_ignore("unused_signal")
signal player_damaged
@warning_ignore("unused_signal")
signal player_died

# UI request signals
@warning_ignore("unused_signal")
signal player_damage_flash_requested(intensity: float, duration: float)
@warning_ignore("unused_signal")
signal player_rage_mode_changed(active: bool, opacity: float)

# Combat events
@warning_ignore("unused_signal")
signal enemy_shot(enemy: Node)

# Weapon events
@warning_ignore("unused_signal")
signal weapon_fired
