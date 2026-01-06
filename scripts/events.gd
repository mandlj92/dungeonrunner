extends Node

# Event Bus for global game events
# Register this as an Autoload named "Events" in Project Settings

# Projectile spawning
signal spawn_projectile(scene: PackedScene, spawn_transform: Transform3D, damage: int, shooter: Node)

# Player health events
signal player_health_changed(current: int, max: int)
signal player_damaged
signal player_died

# UI request signals
signal player_damage_flash_requested(intensity: float, duration: float)
signal player_rage_mode_changed(active: bool, opacity: float)
