extends Resource
class_name EnemyStats

## Resource for enemy balance data
## Allows tweaking enemy stats without modifying code

@export var max_health: int = 30
@export var speed: float = 3.5
@export var damage: int = 10
@export var attack_range: float = 1.8
@export var attack_cooldown: float = 1.0
@export var aggro_range: float = 15.0
@export var hit_stun_time: float = 0.25
@export var hit_knockback: float = 4.0
