extends CharacterBody3D

@export var max_health := 30
@export var speed := 3.5
@export var damage := 10
@export var attack_range := 1.8
@export var attack_cooldown := 1.0
@export var hit_stun_time := 0.25
@export var hit_knockback := 4.0
@export var flash_color := Color(1.5, 0.3, 0.3)
@export var flash_time := 0.1
@export var aggro_range := 15.0  # Distance at which enemy starts chasing player

var health := 30
var _attack_timer := 0.0
var _hit_stun_timer := 0.0

@onready var agent := $NavigationAgent3D
@onready var mesh := $MeshInstance3D
var player: Node3D

@export var debug_ai := false
@export var debug_tint := false
var _using_fallback := false
func _ready() -> void:
	health = max_health
	player = get_tree().get_first_node_in_group("player")

	# Debug: print collision shape and agent settings when enabled
	if debug_ai:
		var col = $CollisionShape3D
		if col and col.shape:
			print("[Enemy]", name, "collision shape:", col.shape.get_class(), col.shape)
		else:
			print("[Enemy]", name, "no CollisionShape3D or shape")
		if agent:
			print("[Enemy]", name, "NavAgent radius:", agent.radius, "height:", agent.height, "max_speed:", agent.max_speed)

	# Try to configure the NavigationAgent3D size to match the physics shape
	if agent and $CollisionShape3D and $CollisionShape3D.shape:
		var shape = $CollisionShape3D.shape
		if shape is CapsuleShape3D:
			agent.radius = shape.radius
			agent.height = shape.height
		elif shape is BoxShape3D:
			# Box extents are half-sizes
			var ext = shape.size
			agent.radius = max(ext.x, ext.z)
			agent.height = ext.y * 2.0
		# ensure agent speed matches exported speed
		agent.max_speed = speed

	# Configure navigation agent
	agent.path_desired_distance = 0.5
	agent.target_desired_distance = 0.5
	agent.max_speed = speed

func _physics_process(delta: float) -> void:
	# Ensure we have a reference to the player (in case this enemy was
	# instantiated before the player was added to the scene tree).
	if not player:
		player = get_tree().get_first_node_in_group("player")
		if not player:
			return
	_attack_timer = max(0.0, _attack_timer - delta)
	_hit_stun_timer = max(0.0, _hit_stun_timer - delta)

	# Check distance to player
	var dist = global_transform.origin.distance_to(player.global_transform.origin)

	# Only chase if player is within aggro range
	if dist <= aggro_range:
		agent.target_position = player.global_transform.origin
		var next_pos = agent.get_next_path_position()
		# If the agent has no valid path (returns zero or is effectively at the
		# same position), fall back to directly moving toward the player so
		# enemies still chase even if the navmesh/agent couldn't compute a path.
		var used_fallback := false
		if next_pos == Vector3.ZERO or next_pos.distance_to(global_transform.origin) <= 0.05:
			# NavigationAgent3D returned an unusable next position — fall back
			next_pos = player.global_transform.origin
			used_fallback = true
		# Update debug state and optionally log changes
		if debug_ai and used_fallback != _using_fallback:
			_using_fallback = used_fallback
			if _using_fallback:
				print("[Enemy] ", name, " using NAV FALLBACK at ", global_transform.origin)
			else:
				print("[Enemy] ", name, " using NAV PATH at ", global_transform.origin)
		# Optionally tint the mesh to visualize fallback usage
		if debug_tint and mesh and mesh.get_surface_override_material_count() >= 0:
			if used_fallback:
				mesh.set_surface_override_material(0, StandardMaterial3D.new().duplicate())
				mesh.get_surface_override_material(0).albedo_color = Color(1, 0.6, 0.6)
			else:
				mesh.set_surface_override_material(0, null)
		var dir = (next_pos - global_transform.origin)
		dir.y = 0
		if dir.length() > 0.05:
			dir = dir.normalized()
		var speed_scale := 0.15 if _hit_stun_timer > 0.0 else 1.0
		velocity.x = dir.x * speed * speed_scale
		velocity.z = dir.z * speed * speed_scale
	else:
		# Stand still when player is out of range
		velocity.x = 0
		velocity.z = 0

	velocity.y += -18.0 * delta
	move_and_slide()

	# attack only if in range
	if dist <= attack_range and _attack_timer <= 0.0:
		_attack_timer = attack_cooldown
		if player.has_method("take_damage"):
			var hit_dir = (player.global_transform.origin - global_transform.origin).normalized()
			player.take_damage(damage, hit_dir)

func take_damage(amount:int, hit_dir: Vector3 = Vector3.ZERO) -> int:
	var applied: int = min(amount, health)
	health -= amount
	_hit_stun_timer = hit_stun_time
	if hit_dir != Vector3.ZERO:
		velocity += hit_dir.normalized() * hit_knockback
	_flash_on_hit()
	_play_hit_sound()
	_spawn_floating_text(applied)
	if health <= 0:
		_spawn_gibs(global_position)
		_die()
	return applied

func _spawn_death_particles() -> void:
	var particles = CPUParticles3D.new()
	get_parent().add_child(particles)
	particles.global_position = global_position

	particles.emitting = true
	particles.one_shot = true
	particles.amount = 20
	particles.lifetime = 0.5
	particles.explosiveness = 1.0

	particles.mesh = BoxMesh.new()
	particles.mesh.size = Vector3(0.1, 0.1, 0.1)
	particles.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	particles.emission_sphere_radius = 0.5
	particles.direction = Vector3(0,1,0)
	particles.spread = 180.0
	particles.initial_velocity_min = 3.0
	particles.initial_velocity_max = 6.0
	particles.gravity = Vector3(0, -20, 0)

	particles.color = Color(0.8, 0.1, 0.1)

	await get_tree().create_timer(1.0).timeout
	particles.queue_free()

func _flash_on_hit() -> void:
	if not mesh:
		return
	if not mesh.mesh:
		return
	var original_override: Material = mesh.get_surface_override_material(0)
	var base_material: Material = original_override
	if base_material == null and mesh.mesh:
		base_material = mesh.mesh.surface_get_material(0)

	var flash_mat: StandardMaterial3D
	if base_material and base_material is StandardMaterial3D:
		flash_mat = base_material.duplicate()
	else:
		flash_mat = StandardMaterial3D.new()
	flash_mat.albedo_color = flash_color

	mesh.set_surface_override_material(0, flash_mat)
	await get_tree().create_timer(flash_time).timeout
	mesh.set_surface_override_material(0, original_override)

func _play_hit_sound() -> void:
	var player_audio = AudioStreamPlayer3D.new()
	add_child(player_audio)

	var gen = AudioStreamGenerator.new()
	gen.mix_rate = 22050
	player_audio.stream = gen
	player_audio.play()

	var playback = player_audio.get_stream_playback() as AudioStreamGeneratorPlayback
	for i in range(1200):
		var sample = randf_range(-0.3, 0.3) * exp(-i/400.0)
		playback.push_frame(Vector2(sample, sample))

	await get_tree().create_timer(0.12).timeout
	player_audio.queue_free()

func _spawn_gibs(_pos: Vector3) -> void:
	for i in range(randi_range(4, 5)):
		# Create RigidBody3D
		var gib = RigidBody3D.new()
		# Add to scene root to prevent premature deletion if enemy dies
		get_tree().current_scene.add_child(gib)

		# Position with random offset to prevent stacking (Y offset ensures upward spawn)
		gib.global_position = global_position + Vector3(randf_range(-0.5, 0.5), randf_range(0.5, 1.0), randf_range(-0.5, 0.5))

		# Add mesh
		var mesh_inst = MeshInstance3D.new()
		var box_mesh = BoxMesh.new()
		box_mesh.size = Vector3(0.2, 0.2, 0.2)
		mesh_inst.mesh = box_mesh

		# Create red material
		var mat = StandardMaterial3D.new()
		mat.albedo_color = Color(0.8, 0.1, 0.1)
		mesh_inst.set_surface_override_material(0, mat)
		gib.add_child(mesh_inst)

		# Add collision shape
		var col_shape = CollisionShape3D.new()
		var box_shape = BoxShape3D.new()
		box_shape.size = Vector3(0.2, 0.2, 0.2)
		col_shape.shape = box_shape
		gib.add_child(col_shape)

		# Apply strong random impulse to scatter gibs away from center
		var impulse_dir := Vector3(randf_range(-1, 1), randf_range(0.5, 1), randf_range(-1, 1)).normalized()
		gib.apply_impulse(impulse_dir * randf_range(8.0, 12.0))

		# Cleanup using scene tree timer (since gib is now part of scene root)
		get_tree().create_timer(3.0).timeout.connect(gib.queue_free)

func _spawn_floating_text(damage_amount: int) -> void:
	var label = Label3D.new()
	# Add to scene root to prevent premature deletion if enemy dies
	get_tree().current_scene.add_child(label)
	label.global_position = global_position + Vector3(0, 1.5, 0)
	label.text = str(damage_amount)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.font_size = 48

	# Critical damage (>20) is yellow
	if damage_amount > 20:
		label.modulate = Color.YELLOW
	else:
		label.modulate = Color.WHITE

	# Use tween for reliable animation and guaranteed cleanup
	var tween = create_tween()
	tween.tween_property(label, "position", label.position + Vector3(0, 1.5, 0), 0.5)
	tween.parallel().tween_property(label, "modulate:a", 0.0, 0.5)
	tween.tween_callback(label.queue_free)

func _die() -> void:
	# Disable collision
	if $CollisionShape3D:
		$CollisionShape3D.disabled = true

	# Hide mesh
	if mesh:
		mesh.visible = false

	# Spawn death particles
	_spawn_death_particles()

	# Play high-pitched death sound
	_play_death_sound()

	# Trigger screen shake on player
	if player and player.has_method("screen_shake"):
		player.screen_shake(0.2, 0.8)

	# Add coins (5x for elites)
	var coin_amount = 5
	if has_meta("is_elite"):
		coin_amount = 25
	GameState.add_coins(coin_amount)

	# Wait for sound/animation, then cleanup
	await get_tree().create_timer(0.5).timeout
	queue_free()

func _play_death_sound() -> void:
	var player_audio = AudioStreamPlayer3D.new()
	add_child(player_audio)

	var gen = AudioStreamGenerator.new()
	gen.mix_rate = 44100
	player_audio.stream = gen
	player_audio.play()

	var playback = player_audio.get_stream_playback() as AudioStreamGeneratorPlayback
	# High-pitched death sound
	for i in range(2200):
		var pitch = 800.0 + (i * 0.5)  # Rising pitch
		var sample = sin(i * pitch * 0.0001) * exp(-i/600.0) * 0.4
		playback.push_frame(Vector2(sample, sample))

	await get_tree().create_timer(0.5).timeout
	player_audio.queue_free()
