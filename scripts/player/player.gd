extends CharacterBody3D

@export var base_speed := 6.0
@export var sprint_mult := 1.4
@export var mouse_sens := 0.002
@export var jump_velocity := 8.0
@export var gravity := 18.0

@export var fall_death_threshold := -20.0
@export var fall_death_time := 5.0
var _fall_timer := 0.0

const COYOTE_TIME := 0.15
var _coyote_timer := 0.0

const FOV_BASE := 75.0
const FOV_SPRINT := 85.0

@export var hurt_knockback := 7.0
@export var hurt_flash_time := 0.25

@export var damage_sfx: AudioStream

var _run_time := 0.0
var _shake_remaining := 0.0
var _shake_intensity := 0.0
var _original_cam_position: Vector3
var _rage_mode_active := false
var _rage_timer := 0.0
var _mouse_input: Vector2 = Vector2.ZERO

@onready var head := $Head
@onready var cam := $Head/Camera3D
@onready var hitscan := $Head/RayCast3D
@onready var health_component := $HealthComponent as HealthComponent
@onready var weapon_controller := $WeaponController as WeaponController
@onready var melee_controller := $MeleeController as MeleeController

var pause_menu: Control

signal died
signal exited
signal run_time_updated(time: float)

func _ready() -> void:
	add_to_group("player")
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	_original_cam_position = cam.position

	# Setup components
	if weapon_controller:
		weapon_controller.setup(cam, hitscan, self)
		weapon_controller.fired.connect(_on_weapon_fired)
		weapon_controller.ammo_changed.connect(_on_ammo_changed)

	if melee_controller:
		melee_controller.setup(cam, self)
		melee_controller.hit_landed.connect(_on_melee_hit_landed)

	if health_component:
		health_component.damaged.connect(_on_damaged)
		health_component.died.connect(_on_died)
		health_component.health_changed.connect(_on_health_changed)

	_apply_meta_upgrades()

	# Emit initial health state via Events
	if health_component:
		Events.player_health_changed.emit(health_component.health, health_component.max_health)

	# Create pause menu
	var pause_scene = load("res://scenes/ui/pause_menu.tscn")
	pause_menu = pause_scene.instantiate()
	add_child(pause_menu)

func _apply_meta_upgrades() -> void:
	if health_component:
		var base_max_health = 100
		health_component.max_health = base_max_health + (GameState.upgrades[GameState.UpgradeType.MAX_HEALTH] * 10)
		health_component.health = health_component.max_health

	if weapon_controller:
		var base_ammo_max = 30
		weapon_controller.ammo_max = base_ammo_max + (GameState.upgrades[GameState.UpgradeType.AMMO_MAX] * 5)
		weapon_controller.ammo = weapon_controller.ammo_max

		var base_gun_damage = 10
		weapon_controller.damage = int(base_gun_damage * (1.0 + 0.10 * GameState.upgrades[GameState.UpgradeType.GUN_DAMAGE]))

	if melee_controller:
		var base_melee_damage = 20
		melee_controller.damage = int(base_melee_damage * (1.0 + 0.10 * GameState.upgrades[GameState.UpgradeType.MELEE_DAMAGE]))

	base_speed *= (1.0 + 0.03 * GameState.upgrades[GameState.UpgradeType.MOVE_SPEED])

func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		# Accumulate mouse input instead of applying rotation immediately
		_mouse_input += event.relative

	if event.is_action_pressed("pause"):
		if get_tree().paused:
			pause_menu.resume_game()
		else:
			pause_menu.pause_game()

func _physics_process(delta: float) -> void:
	_run_time += delta
	run_time_updated.emit(_run_time)

	_update_rage_mode(delta)
	_update_screen_shake(delta)

	# Apply accumulated mouse input to rotation
	if _mouse_input != Vector2.ZERO:
		rotate_y(-_mouse_input.x * mouse_sens)
		head.rotate_x(-_mouse_input.y * mouse_sens)
		head.rotation.x = clamp(head.rotation.x, deg_to_rad(-80), deg_to_rad(80))
		_mouse_input = Vector2.ZERO

	# Dynamic FOV based on speed
	var horizontal_velocity := Vector2(velocity.x, velocity.z).length()
	if horizontal_velocity > base_speed * 1.1:
		cam.fov = lerp(cam.fov, FOV_SPRINT, delta * 8.0)
	else:
		cam.fov = lerp(cam.fov, FOV_BASE, delta * 8.0)

	var dir := Vector3.ZERO
	if Input.is_action_pressed("move_forward"): dir -= transform.basis.z
	if Input.is_action_pressed("move_backward"): dir += transform.basis.z
	if Input.is_action_pressed("move_left"): dir -= transform.basis.x
	if Input.is_action_pressed("move_right"): dir += transform.basis.x
	dir = dir.normalized()

	var speed := base_speed
	if Input.is_action_pressed("sprint"):
		speed *= sprint_mult

	velocity.x = dir.x * speed
	velocity.z = dir.z * speed

	# Update coyote timer
	if is_on_floor():
		_coyote_timer = COYOTE_TIME
	else:
		_coyote_timer = max(0.0, _coyote_timer - delta)

	# Apply gravity
	if not is_on_floor():
		velocity.y -= gravity * delta

	# Jump with coyote time
	if Input.is_action_just_pressed("jump") and (is_on_floor() or _coyote_timer > 0.0):
		velocity.y = jump_velocity
		_coyote_timer = 0.0  # Consume coyote time

	move_and_slide()

	# falling / death plane: if the player falls below the threshold and stays
	# below for `fall_death_time` seconds, count as death
	if global_transform.origin.y < fall_death_threshold:
		_fall_timer += delta
		if _fall_timer >= fall_death_time:
			died.emit()
	else:
		_fall_timer = 0.0

	if Input.is_action_pressed("fire") and weapon_controller:
		weapon_controller.try_fire()

	if Input.is_action_pressed("melee") and melee_controller:
		melee_controller.try_melee()

# Signal handlers for components
func _on_weapon_fired(spawn_transform: Transform3D, damage_amount: int) -> void:
	# Forward to Events autoload for projectile spawning
	if weapon_controller and weapon_controller.projectile_scene:
		Events.spawn_projectile.emit(weapon_controller.projectile_scene, spawn_transform, damage_amount, self)

func _on_ammo_changed(current: int, maximum: int) -> void:
	# Can be connected by HUD via Events or directly
	pass

func _on_melee_hit_landed(target: Node, damage_dealt: int) -> void:
	on_attack_landed(damage_dealt)

	# Add hit-stop for impact feel
	GameState.hit_stop(0.05, 0.1)

func on_attack_landed(damage_dealt: int) -> void:
	_apply_lifesteal(damage_dealt)

func _apply_lifesteal(damage_dealt: int) -> void:
	var lvl: int = GameState.upgrades.get(GameState.UpgradeType.LIFESTEAL, 0)
	if lvl <= 0: return
	var heal_amount := int(round(damage_dealt * (lvl * 0.01)))
	if heal_amount <= 0:
		heal_amount = 1
	heal(heal_amount)

func _on_damaged(amount: int, hit_dir: Vector3) -> void:
	if hit_dir != Vector3.ZERO:
		var dir := hit_dir.normalized()
		velocity += dir * hurt_knockback

	_screen_shake(0.3, 0.45)
	_play_damage_sound()
	Events.player_damaged.emit()

	# Signal HUD to flash damage (HUD should connect to Events)
	Events.player_damage_flash_requested.emit(0.8, hurt_flash_time)

func _on_died() -> void:
	died.emit()

func _on_health_changed(current: int, maximum: int) -> void:
	Events.player_health_changed.emit(current, maximum)

func take_damage(amount: int, hit_dir: Vector3 = Vector3.ZERO) -> void:
	if health_component:
		health_component.take_damage(amount, hit_dir)

func add_ammo(amount: int) -> void:
	if weapon_controller:
		weapon_controller.add_ammo(amount)

func heal(amount: int) -> void:
	if health_component:
		health_component.heal(amount)

func _screen_shake(duration: float, intensity: float) -> void:
	_shake_remaining = duration
	_shake_intensity = intensity

func screen_shake(duration: float, intensity: float) -> void:
	_screen_shake(duration, intensity)

func _update_screen_shake(delta: float) -> void:
	if _shake_remaining > 0:
		_shake_remaining -= delta
		var offset = Vector3(
			randf_range(-1, 1),
			randf_range(-1, 1),
			0
		) * _shake_intensity
		cam.position = _original_cam_position + offset
	else:
		cam.position = _original_cam_position

func _play_damage_sound() -> void:
	play_sfx(damage_sfx, 0.95, 1.05)

func play_sfx(stream: AudioStream, pitch_min: float = 0.9, pitch_max: float = 1.1) -> void:
	if not stream:
		return

	var audio_player := AudioStreamPlayer3D.new()
	add_child(audio_player)
	audio_player.stream = stream
	audio_player.pitch_scale = randf_range(pitch_min, pitch_max)
	audio_player.play()
	audio_player.finished.connect(audio_player.queue_free)

func activate_rage_mode(duration: float) -> void:
	_rage_mode_active = true
	_rage_timer = duration

	# Reduce fire_cooldown by 50%
	if weapon_controller:
		weapon_controller.apply_rage_mode(0.5)

	# Request HUD to show rage mode effect
	Events.player_rage_mode_changed.emit(true, 0.15)

func _update_rage_mode(delta: float) -> void:
	if not _rage_mode_active:
		return

	_rage_timer -= delta
	if _rage_timer <= 0.0:
		_deactivate_rage_mode()

func _deactivate_rage_mode() -> void:
	_rage_mode_active = false
	_rage_timer = 0.0

	# Reset fire_cooldown
	if weapon_controller:
		weapon_controller.reset_fire_rate()

	# Clear rage mode effect
	Events.player_rage_mode_changed.emit(false, 0.0)
