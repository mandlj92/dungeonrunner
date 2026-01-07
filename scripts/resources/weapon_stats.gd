extends Resource
class_name WeaponStats

## Resource for weapon balance data
## Allows tweaking weapon stats without modifying code

@export var ammo_max: int = 30
@export var damage: int = 10
@export var fire_cooldown: float = 0.15
@export var projectile_scene: PackedScene
