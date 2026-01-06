extends UpgradeEffect
class_name ExplosiveReload

## Reloading creates a shockwave that knocks back nearby enemies

@export var knockback_radius := 5.0
@export var knockback_force := 10.0

func _on_applied() -> void:
	upgrade_name = "Explosive Reload"
	description = "Reloading knocks back nearby enemies"
	trigger_type = TriggerType.ON_RELOAD

func _on_triggered(context: Dictionary) -> void:
	if not owner_entity:
		return

	# Create explosion effect
	_create_shockwave_visual()

	# Find nearby enemies and knock them back
	var space_state = owner_entity.get_world_3d().direct_space_state
	var query = PhysicsShapeQueryParameters3D.new()

	var sphere = SphereShape3D.new()
	sphere.radius = knockback_radius
	query.shape = sphere
	query.transform = Transform3D(Basis(), owner_entity.global_position)
	query.collision_mask = 2  # Enemy layer

	var results = space_state.intersect_shape(query)
	for result in results:
		var enemy = result["collider"]
		if enemy and enemy.has_method("apply_knockback"):
			var direction = (enemy.global_position - owner_entity.global_position).normalized()
			enemy.apply_knockback(direction * knockback_force)

func _create_shockwave_visual() -> void:
	# Create a simple expanding sphere visual effect
	var shockwave = MeshInstance3D.new()
	owner_entity.add_child(shockwave)

	var sphere_mesh = SphereMesh.new()
	sphere_mesh.radius = 0.5
	sphere_mesh.height = 1.0
	shockwave.mesh = sphere_mesh

	# Create material
	var mat = StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(1.0, 0.5, 0.0, 0.6)
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.5, 0.0)
	shockwave.material_override = mat

	# Animate expansion and fade
	var tween = create_tween()
	tween.set_parallel(true)
	tween.tween_property(shockwave, "scale", Vector3.ONE * knockback_radius, 0.3)
	tween.tween_property(mat, "albedo_color:a", 0.0, 0.3)
	await tween.finished
	shockwave.queue_free()
