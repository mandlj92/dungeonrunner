extends Node
class_name VFXComponent

## Generic visual effects component for entities
## Handles particles, gibs, damage numbers, mesh flashing, and audio
## Separated from game logic per RULES.md Section 5.1

@export var hit_sfx: AudioStream
@export var death_sfx: AudioStream
@export var flash_color := Color(1.5, 0.3, 0.3)
@export var flash_time := 0.1

var _mesh: MeshInstance3D = null

func _ready() -> void:
	# Find parent's mesh automatically
	var parent := get_parent()
	if parent and parent.has_node("MeshInstance3D"):
		_mesh = parent.get_node("MeshInstance3D")

func play_hit_effect(pos: Vector3) -> void:
	_flash_mesh()
	_play_sound(hit_sfx, 0.9, 1.1)

func play_death_effect(pos: Vector3) -> void:
	_spawn_death_particles(pos)
	_spawn_gibs(pos, randi_range(4, 5))
	_play_sound(death_sfx, 0.9, 1.1)

func spawn_damage_number(pos: Vector3, amount: int) -> void:
	var label := Label3D.new()
	get_tree().current_scene.add_child(label)
	label.global_position = pos
	label.text = str(amount)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.font_size = 48

	# Critical damage (>20) is yellow
	if amount > 20:
		label.modulate = Color.YELLOW
	else:
		label.modulate = Color.WHITE

	# Animate upward and fade
	var tween := create_tween()
	tween.tween_property(label, "position", label.position + Vector3(0, 1.5, 0), 0.5)
	tween.parallel().tween_property(label, "modulate:a", 0.0, 0.5)
	tween.tween_callback(label.queue_free)

func set_elite_appearance() -> void:
	if not _mesh:
		return

	# Change material to red for elite enemies
	var elite_mat := StandardMaterial3D.new()
	elite_mat.albedo_color = Color(1.0, 0.0, 0.0)
	elite_mat.emission_enabled = true
	elite_mat.emission = Color(1.0, 0.3, 0.3)
	elite_mat.emission_energy_multiplier = 0.5
	_mesh.set_surface_override_material(0, elite_mat)

func _flash_mesh() -> void:
	if not _mesh or not _mesh.mesh:
		return

	var original_override: Material = _mesh.get_surface_override_material(0)
	var base_material: Material = original_override
	if base_material == null and _mesh.mesh:
		base_material = _mesh.mesh.surface_get_material(0)

	var flash_mat: StandardMaterial3D
	if base_material and base_material is StandardMaterial3D:
		flash_mat = base_material.duplicate()
	else:
		flash_mat = StandardMaterial3D.new()
	flash_mat.albedo_color = flash_color

	_mesh.set_surface_override_material(0, flash_mat)
	await get_tree().create_timer(flash_time).timeout
	_mesh.set_surface_override_material(0, original_override)

func _spawn_death_particles(pos: Vector3) -> void:
	var particles := CPUParticles3D.new()
	get_tree().current_scene.add_child(particles)
	particles.global_position = pos

	particles.emitting = true
	particles.one_shot = true
	particles.amount = 20
	particles.lifetime = 0.5
	particles.explosiveness = 1.0

	particles.mesh = BoxMesh.new()
	particles.mesh.size = Vector3(0.1, 0.1, 0.1)
	particles.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	particles.emission_sphere_radius = 0.5
	particles.direction = Vector3(0, 1, 0)
	particles.spread = 180.0
	particles.initial_velocity_min = 3.0
	particles.initial_velocity_max = 6.0
	particles.gravity = Vector3(0, -20, 0)

	particles.color = Color(0.8, 0.1, 0.1)

	await get_tree().create_timer(1.0).timeout
	particles.queue_free()

func _spawn_gibs(pos: Vector3, count: int) -> void:
	for i in range(count):
		var gib := RigidBody3D.new()
		get_tree().current_scene.add_child(gib)

		# Position with random offset
		gib.global_position = pos + Vector3(
			randf_range(-0.5, 0.5),
			randf_range(0.5, 1.0),
			randf_range(-0.5, 0.5)
		)

		# Add mesh
		var mesh_inst := MeshInstance3D.new()
		var box_mesh := BoxMesh.new()
		box_mesh.size = Vector3(0.2, 0.2, 0.2)
		mesh_inst.mesh = box_mesh

		# Red material
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(0.8, 0.1, 0.1)
		mesh_inst.set_surface_override_material(0, mat)
		gib.add_child(mesh_inst)

		# Add collision shape
		var col_shape := CollisionShape3D.new()
		var box_shape := BoxShape3D.new()
		box_shape.size = Vector3(0.2, 0.2, 0.2)
		col_shape.shape = box_shape
		gib.add_child(col_shape)

		# Apply random impulse
		var impulse_dir := Vector3(
			randf_range(-1, 1),
			randf_range(0.5, 1),
			randf_range(-1, 1)
		).normalized()
		gib.apply_impulse(impulse_dir * randf_range(8.0, 12.0))

		# Cleanup after 3 seconds
		get_tree().create_timer(3.0).timeout.connect(gib.queue_free)

func _play_sound(stream: AudioStream, pitch_min: float = 0.9, pitch_max: float = 1.1) -> void:
	if not stream:
		return

	var audio_player := AudioStreamPlayer3D.new()
	var parent := get_parent()
	if parent:
		parent.add_child(audio_player)
		audio_player.stream = stream
		audio_player.pitch_scale = randf_range(pitch_min, pitch_max)
		audio_player.play()
		audio_player.finished.connect(audio_player.queue_free)
