extends Area3D

@export var speed := 40.0
@export var damage := 10
@export var lifetime := 3.0
@export var debug_projectile := false

var direction := Vector3.ZERO
var _time_alive := 0.0
var shooter: Node3D

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _physics_process(delta: float) -> void:
	global_position += direction * speed * delta
	_time_alive += delta

	if _time_alive >= lifetime:
		queue_free()

func _on_body_entered(body: Node3D) -> void:
	# Ignore the shooter
	if body == shooter:
		return
	if debug_projectile:
		if body:
			print("[Projectile] hit:", body.name, "class:", body.get_class(), "layer:", body.collision_layer, "mask:", body.collision_mask)
		else:
			print("[Projectile] hit: null body")

	# Spawn hit particles at impact point
	_spawn_hit_particles(global_position)

	# Deal damage
	var dealt := damage
	if body and body.has_method("take_damage"):
		var res = body.take_damage(damage, direction)
		if typeof(res) == TYPE_INT:
			dealt = res
	if shooter and shooter.has_method("on_attack_landed"):
		shooter.on_attack_landed(dealt)

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
