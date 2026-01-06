extends UpgradeEffect
class_name FireTrail

## Leave a trail of fire when sprinting that damages enemies

@export var fire_damage := 5
@export var fire_interval := 0.3
@export var fire_lifetime := 2.0

var _spawn_timer := 0.0

func _on_applied() -> void:
	upgrade_name = "Fire Trail"
	description = "Sprinting leaves a trail of fire"
	trigger_type = TriggerType.PASSIVE  # Continuous effect

func _process(delta: float) -> void:
	if not is_active or not owner_entity:
		return

	# Check if player is sprinting
	var is_sprinting := false
	if owner_entity.has_method("is_sprinting"):
		is_sprinting = owner_entity.is_sprinting()
	elif Input.is_action_pressed("sprint"):
		is_sprinting = true

	if is_sprinting:
		_spawn_timer -= delta
		if _spawn_timer <= 0.0:
			_spawn_fire_patch()
			_spawn_timer = fire_interval

func _spawn_fire_patch() -> void:
	if not owner_entity:
		return

	# Create fire area at player's position
	var fire_area = Area3D.new()
	owner_entity.get_parent().add_child(fire_area)
	fire_area.global_position = owner_entity.global_position
	fire_area.collision_layer = 0
	fire_area.collision_mask = 2  # Enemy layer

	# Add collision shape
	var collision = CollisionShape3D.new()
	var shape = CylinderShape3D.new()
	shape.radius = 1.5
	shape.height = 0.5
	collision.shape = shape
	fire_area.add_child(collision)

	# Create visual effect
	var fire_visual = _create_fire_visual()
	fire_area.add_child(fire_visual)

	# Damage enemies that enter
	var damage_timer := Timer.new()
	fire_area.add_child(damage_timer)
	damage_timer.wait_time = 0.5
	damage_timer.timeout.connect(func():
		for body in fire_area.get_overlapping_bodies():
			if body and body.has_method("take_damage"):
				body.take_damage(fire_damage, Vector3.ZERO)
	)
	damage_timer.start()

	# Remove after lifetime
	await owner_entity.get_tree().create_timer(fire_lifetime).timeout
	fire_area.queue_free()

func _create_fire_visual() -> Node3D:
	# Create a simple fire effect using particles or mesh
	var fire = MeshInstance3D.new()
	var cylinder = CylinderMesh.new()
	cylinder.top_radius = 1.5
	cylinder.bottom_radius = 1.5
	cylinder.height = 0.2
	fire.mesh = cylinder

	var mat = StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(1.0, 0.3, 0.0, 0.5)
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.5, 0.0)
	mat.emission_energy_multiplier = 2.0
	fire.material_override = mat

	# Animate flickering
	var tween = create_tween()
	tween.set_loops()
	tween.tween_property(mat, "emission_energy_multiplier", 3.0, 0.3)
	tween.tween_property(mat, "emission_energy_multiplier", 1.5, 0.3)

	return fire
