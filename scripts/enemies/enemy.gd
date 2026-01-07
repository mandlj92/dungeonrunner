extends CharacterBody3D

## Enemy AI with state machine and component-based architecture
## Uses HealthComponent, VFXComponent, and EnemyStateHelper per RULES.md

@export var stats: EnemyStats
@export var debug_ai := false
@export var debug_tint := false
@export var separation_distance := 2.0
@export var separation_force := 5.0

enum State { SLEEPING, CHASING, SURROUNDING, ATTACKING }

var speed := 3.5
var damage := 10
var attack_range := 1.8
var attack_cooldown := 1.0
var aggro_range := 15.0
var hit_stun_time := 0.25
var hit_knockback := 4.0
var _attack_timer := 0.0
var _hit_stun_timer := 0.0
var _state: State = State.SLEEPING
var _token_request_timer := 0.0
const TOKEN_REQUEST_INTERVAL := 0.1

@onready var agent := $NavigationAgent3D
@onready var mesh := $MeshInstance3D
@onready var health_component := $HealthComponent as HealthComponent
@onready var vfx := $VFXComponent as VFXComponent
@onready var state_helper := $EnemyStateHelper as EnemyStateHelper

var player: Node3D
var _raycast: RayCast3D = null

func _ready() -> void:
	if stats:
		speed = stats.speed
		damage = stats.damage
		attack_range = stats.attack_range
		attack_cooldown = stats.attack_cooldown
		aggro_range = stats.aggro_range
		hit_stun_time = stats.hit_stun_time
		hit_knockback = stats.hit_knockback
		if health_component:
			health_component.max_health = stats.max_health
			health_component.health = stats.max_health

	if health_component:
		health_component.damaged.connect(_on_damaged)
		health_component.died.connect(_die)

	if debug_ai:
		var col := $CollisionShape3D
		if col and col.shape:
			print("[Enemy]", name, "collision shape:", col.shape.get_class(), col.shape)
		if agent:
			print("[Enemy]", name, "NavAgent radius:", agent.radius, "height:", agent.height)

	if agent and $CollisionShape3D and $CollisionShape3D.shape:
		var shape: Shape3D = $CollisionShape3D.shape
		if shape is CapsuleShape3D:
			agent.radius = shape.radius
			agent.height = shape.height
		elif shape is BoxShape3D:
			var ext: Vector3 = shape.size
			agent.radius = max(ext.x, ext.z)
			agent.height = ext.y * 2.0
		agent.max_speed = speed

	agent.path_desired_distance = 0.5
	agent.target_desired_distance = 0.5
	agent.max_speed = speed
	agent.avoidance_enabled = true
	agent.velocity_computed.connect(_on_velocity_computed)
	add_to_group("enemies")

	_raycast = RayCast3D.new()
	add_child(_raycast)
	_raycast.enabled = true
	_raycast.exclude_parent = true
	_raycast.collision_mask = 0b0101

	_state = State.SLEEPING
	set_physics_process(false)

func initialize(target_node: Node3D) -> void:
	player = target_node

func wake_up() -> void:
	if _state != State.SLEEPING:
		return
	print("[Enemy] ", name, " waking up!")
	_state = State.CHASING
	set_physics_process(true)

func go_dormant() -> void:
	if _state == State.SLEEPING:
		return
	if _state == State.ATTACKING:
		AttackManager.return_attack(self)
	_state = State.SLEEPING
	set_physics_process(false)

func _physics_process(delta: float) -> void:
	if not player:
		return
	_attack_timer = max(0.0, _attack_timer - delta)
	_hit_stun_timer = max(0.0, _hit_stun_timer - delta)

	match _state:
		State.SLEEPING:
			return
		State.CHASING:
			var result := state_helper.process_chasing(
				self, player, agent, _raycast, delta,
				speed, attack_range, aggro_range, _hit_stun_timer
			)
			velocity = result.velocity
			if result.has("new_state") and result.new_state != null:
				_state = result.new_state as State
				_token_request_timer = 0.0
		State.SURROUNDING:
			var result := state_helper.process_surrounding(
				self, player, agent, delta,
				speed, attack_range, _token_request_timer, AttackManager
			)
			velocity = result.velocity
			_token_request_timer = result.token_request_timer
			if result.has("new_state") and result.new_state != null:
				_state = result.new_state as State
			if result.has("attack_timer_reset") and result.attack_timer_reset:
				_attack_timer = 0.0
		State.ATTACKING:
			var result := state_helper.process_attacking(
				self, player, delta, _attack_timer,
				attack_cooldown, attack_range, damage, AttackManager
			)
			if result.attack_executed:
				_attack_timer = attack_cooldown
			if result.has("new_state") and result.new_state != null:
				_state = result.new_state as State
				if _state == State.SURROUNDING:
					_token_request_timer = 0.0

	velocity.y += -18.0 * delta
	if agent.avoidance_enabled:
		agent.velocity = velocity

func _on_velocity_computed(safe_velocity: Vector3) -> void:
	velocity = safe_velocity
	move_and_slide()

func take_damage(amount: int, hit_dir: Vector3 = Vector3.ZERO) -> int:
	if health_component:
		return health_component.take_damage(amount, hit_dir)
	return 0

func _on_damaged(amount: int, hit_dir: Vector3) -> void:
	if not has_meta("is_elite"):
		_hit_stun_timer = hit_stun_time
	if hit_dir != Vector3.ZERO:
		velocity += hit_dir.normalized() * hit_knockback
	if vfx:
		vfx.play_hit_effect(global_position)
		vfx.spawn_damage_number(global_position + Vector3(0, 1.5, 0), amount)

func _die() -> void:
	if _state == State.ATTACKING:
		AttackManager.return_attack(self)
	if $CollisionShape3D:
		$CollisionShape3D.disabled = true
	if mesh:
		mesh.visible = false
	if vfx:
		vfx.play_death_effect(global_position)
	if player and player.has_method("screen_shake"):
		player.screen_shake(0.2, 0.8)
	var coin_amount := 5
	if has_meta("is_elite"):
		coin_amount = 25
	GameState.add_coins(coin_amount)
	await get_tree().create_timer(0.5).timeout
	queue_free()
