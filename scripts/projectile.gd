extends Area3D

@export var speed := 40.0
@export var damage := 10
@export var lifetime := 3.0
@export var debug_projectile := false

var direction := Vector3.ZERO
var _time_alive := 0.0
var shooter: Node3D
var can_pierce := false
var pierce_count := 0
var max_pierce := 2
var _pierced_enemies := []  # Track enemies we've already hit

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func set_pierce_count(count: int) -> void:
	can_pierce = true
	max_pierce = count

func _physics_process(delta: float) -> void:
	global_position += direction * speed * delta
	_time_alive += delta

	if _time_alive >= lifetime:
		queue_free()

func _on_body_entered(body: Node3D) -> void:
	# Ignore the shooter
	if body == shooter:
		return

	# Ignore enemies we've already pierced
	if can_pierce and body in _pierced_enemies:
		return

	if debug_projectile:
		if body:
			print("[Projectile] hit:", body.name, "class:", body.get_class(), "layer:", body.collision_layer, "mask:", body.collision_mask)
		else:
			print("[Projectile] hit: null body")

	# Spawn hit particles at impact point
	_spawn_hit_particles(global_position)

	# Deal damage with hit stop
	var dealt := damage
	var is_enemy := false
	if body and body.has_method("take_damage"):
		is_enemy = true
		await GameState.hit_stop(0.05, 0.1)
		var res = body.take_damage(damage, direction)
		if typeof(res) == TYPE_INT:
			dealt = res

		# Emit enemy_shot signal for upgrades like Vampire Bullets
		Events.enemy_shot.emit(body)

	if shooter and shooter.has_method("on_attack_landed"):
		shooter.on_attack_landed(dealt)

	# Handle piercing
	if can_pierce and is_enemy:
		_pierced_enemies.append(body)
		pierce_count += 1

		# Only destroy if we've hit max pierce count or hit a wall
		if pierce_count >= max_pierce:
			queue_free()
		# Continue flying if we can still pierce
	else:
		# No pierce, destroy on hit
		queue_free()

func _spawn_hit_particles(pos: Vector3) -> void:
	var particles = CPUParticles3D.new()
	get_tree().root.add_child(particles)
	particles.global_position = pos

	particles.emitting = true
	particles.one_shot = true
	particles.amount = 10
	particles.lifetime = 0.3
	particles.explosiveness = 1.0

	particles.mesh = SphereMesh.new()
	particles.mesh.radius = 0.05
	particles.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
	particles.emission_sphere_radius = 0.2
	particles.direction = Vector3(0,1,0)
	particles.spread = 45.0
	particles.initial_velocity_min = 2.0
	particles.initial_velocity_max = 4.0
	particles.gravity = Vector3(0, -9.8, 0)

	var gradient = Gradient.new()
	gradient.add_point(0.0, Color.ORANGE)
	gradient.add_point(1.0, Color.RED)
	particles.color_ramp = gradient

	await get_tree().create_timer(1.0).timeout
	particles.queue_free()
