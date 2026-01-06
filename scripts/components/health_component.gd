extends Node
class_name HealthComponent

## Generic health component that can be attached to any entity (player, enemy, etc.)
## Manages health, damage, healing, invulnerability, and death

@export var max_health := 100
@export var invulnerability_time := 0.0
@export var knockback_strength := 0.0

var health := 100
var _invuln_timer := 0.0

signal health_changed(current: int, maximum: int)
signal damaged(amount: int, hit_dir: Vector3)
signal healed(amount: int)
signal died
signal invulnerability_started
signal invulnerability_ended

func _ready() -> void:
	health = max_health

func _process(delta: float) -> void:
	if _invuln_timer > 0.0:
		_invuln_timer = max(0.0, _invuln_timer - delta)
		if _invuln_timer == 0.0:
			invulnerability_ended.emit()

func set_max_health(value: int) -> void:
	max_health = value
	health = mini(health, max_health)
	health_changed.emit(health, max_health)

func take_damage(amount: int, hit_dir: Vector3 = Vector3.ZERO) -> bool:
	if _invuln_timer > 0.0:
		return false

	if invulnerability_time > 0.0:
		_invuln_timer = invulnerability_time
		invulnerability_started.emit()

	health -= amount
	damaged.emit(amount, hit_dir)

	if health <= 0:
		health = 0
		health_changed.emit(health, max_health)
		died.emit()
		return true
	else:
		health_changed.emit(health, max_health)
		return false

func heal(amount: int) -> void:
	var old_health = health
	health = mini(health + amount, max_health)
	if health > old_health:
		healed.emit(health - old_health)
		health_changed.emit(health, max_health)

func is_invulnerable() -> bool:
	return _invuln_timer > 0.0

func get_health_percent() -> float:
	if max_health == 0:
		return 0.0
	return float(health) / float(max_health)
