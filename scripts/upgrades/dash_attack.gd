extends UpgradeEffect
class_name DashAttack

## Sprinting/dashing into enemies deals damage

@export var dash_damage := 10
@export var dash_knockback := 5.0
@export var damage_cooldown := 0.5

var _damage_timer := 0.0
var _damaged_enemies := {}  # Track enemies to prevent multi-hit

func _on_applied() -> void:
	upgrade_name = "Dash Attack"
	description = "Sprinting into enemies damages them"
	trigger_type = TriggerType.PASSIVE

	# Create a collision area for dash damage
	if owner_entity:
		_setup_dash_area()

func _process(delta: float) -> void:
	if not is_active or not owner_entity:
		return

	# Decrease cooldown timers
	_damage_timer = max(0.0, _damage_timer - delta)

	# Clear old enemy timers
	for enemy in _damaged_enemies.keys():
		_damaged_enemies[enemy] -= delta
		if _damaged_enemies[enemy] <= 0.0:
			_damaged_enemies.erase(enemy)

func _setup_dash_area() -> void:
	# Create an Area3D that detects enemies while sprinting
	var dash_area = Area3D.new()
	dash_area.name = "DashArea"
	owner_entity.add_child(dash_area)
	dash_area.collision_layer = 0
	dash_area.collision_mask = 2  # Enemy layer

	# Add collision shape
	var collision = CollisionShape3D.new()
	var shape = SphereShape3D.new()
	shape.radius = 1.2
	collision.shape = shape
	dash_area.add_child(collision)

	# Connect signals
	dash_area.body_entered.connect(_on_dash_body_entered)

func _on_dash_body_entered(body: Node3D) -> void:
	if not is_active or not owner_entity:
		return

	# Check if player is sprinting
	var is_sprinting := Input.is_action_pressed("sprint")

	if is_sprinting and body and body.has_method("take_damage"):
		# Check if we can damage this enemy (cooldown)
		if _damaged_enemies.has(body) and _damaged_enemies[body] > 0:
			return

		# Calculate knockback direction
		var knockback_dir = Vector3.ZERO
		if owner_entity.has_method("get_velocity"):
			knockback_dir = owner_entity.velocity.normalized()
		else:
			knockback_dir = (body.global_position - owner_entity.global_position).normalized()

		# Deal damage
		body.take_damage(dash_damage, knockback_dir * dash_knockback)

		# Add to cooldown
		_damaged_enemies[body] = damage_cooldown

func _on_removed() -> void:
	if owner_entity and owner_entity.has_node("DashArea"):
		owner_entity.get_node("DashArea").queue_free()
