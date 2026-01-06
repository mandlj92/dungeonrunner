extends CharacterBody3D

@export var base_speed := 6.0
@export var sprint_mult := 1.4
@export var mouse_sens := 0.002
@export var jump_velocity := 8.0
@export var gravity := 18.0

@export var base_max_health := 100
var max_health := 100
var health := 100

@export var base_ammo_max := 30
var ammo_max := 30
var ammo := 30

@export var fall_death_threshold := -20.0
@export var fall_death_time := 5.0
var _fall_timer := 0.0

const COYOTE_TIME := 0.15
var _coyote_timer := 0.0

const FOV_BASE := 75.0
const FOV_SPRINT := 85.0

@export var gun_damage := 10
@export var melee_damage := 20
@export var fire_cooldown := 0.15
@export var melee_cooldown := 0.5
@export var projectile_scene: PackedScene

@export var hurt_invuln_time := 0.6
@export var hurt_knockback := 7.0
@export var hurt_flash_time := 0.25
@export var debug_melee := false

@export var shoot_sfx: AudioStream
@export var hit_sfx: AudioStream
@export var damage_sfx: AudioStream

var _fire_timer := 0.0
var _melee_timer := 0.0
var _run_time := 0.0
var _shake_remaining := 0.0
var _shake_intensity := 0.0
var _original_cam_position: Vector3
var _invuln_timer := 0.0
var _rage_mode_active := false
var _rage_timer := 0.0
var _original_fire_cooldown := 0.0
var _mouse_input: Vector2 = Vector2.ZERO

@onready var head := $Head
@onready var cam := $Head/Camera3D
@onready var hitscan := $Head/RayCast3D
@onready var melee_area := $MeleeArea
@onready var hud := get_tree().get_first_node_in_group("hud")

var pause_menu: Control

signal died
signal exited

func _ready() -> void:
	add_to_group("player")
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	_original_cam_position = cam.position
	_original_fire_cooldown = fire_cooldown
	_apply_meta_upgrades()
	_update_hud()

	# Create pause menu
	var pause_scene = load("res://scenes/ui/pause_menu.tscn")
	pause_menu = pause_scene.instantiate()
	add_child(pause_menu)

func _apply_meta_upgrades() -> void:
	max_health = base_max_health + (GameState.upgrades[GameState.UpgradeType.MAX_HEALTH] * 10)
	health = max_health

	ammo_max = base_ammo_max + (GameState.upgrades[GameState.UpgradeType.AMMO_MAX] * 5)
	ammo = ammo_max

	base_speed *= (1.0 + 0.03 * GameState.upgrades[GameState.UpgradeType.MOVE_SPEED])
	melee_damage = int(melee_damage * (1.0 + 0.10 * GameState.upgrades[GameState.UpgradeType.MELEE_DAMAGE]))
	gun_damage = int(gun_damage * (1.0 + 0.10 * GameState.upgrades[GameState.UpgradeType.GUN_DAMAGE]))

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
	_fire_timer = max(0.0, _fire_timer - delta)
	_melee_timer = max(0.0, _melee_timer - delta)
	_invuln_timer = max(0.0, _invuln_timer - delta)
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

	if Input.is_action_pressed("fire"):
		_try_fire()

	if Input.is_action_pressed("melee"):
		_try_melee()

	if hud:
		hud.set_time(_run_time)

func _try_fire() -> void:
	if _fire_timer > 0.0: return
	if ammo <= 0: return
	if not projectile_scene: return
	_fire_timer = fire_cooldown
	ammo -= 1

	_spawn_muzzle_flash()
	_play_gun_sound()

	# Create spawn transform
	var spawn_transform := Transform3D()
	spawn_transform.origin = hitscan.global_position
	spawn_transform.basis = cam.global_transform.basis

	# Emit signal to spawn projectile
	Events.spawn_projectile.emit(projectile_scene, spawn_transform, gun_damage, self)

	_update_hud()

func _try_melee() -> void:
	if _melee_timer > 0.0: return
	_melee_timer = melee_cooldown

	_melee_swing_visual()
	var overlaps = melee_area.get_overlapping_bodies()
	if debug_melee:
		print("[Melee] overlaps count:", overlaps.size(), "area mask:", melee_area.collision_mask)
	for body in overlaps:
		if debug_melee:
			if body:
				print("[Melee] found:", body.name, "class:", body.get_class(), "layer:", body.collision_layer, "mask:", body.collision_mask)
		if body and body.has_method("take_damage"):
			var dealt := melee_damage
			var res = body.take_damage(melee_damage, -cam.global_transform.basis.z)
			if typeof(res) == TYPE_INT:
				dealt = res
			on_attack_landed(dealt)
			_play_hit_sound()

	_update_hud()

func on_attack_landed(damage_dealt: int) -> void:
	_apply_lifesteal(damage_dealt)

func _apply_lifesteal(damage_dealt: int) -> void:
	var lvl: int = GameState.upgrades.get(GameState.UpgradeType.LIFESTEAL, 0)
	if lvl <= 0: return
	var heal_amount := int(round(damage_dealt * (lvl * 0.01)))
	if heal_amount <= 0:
		heal_amount = 1
	heal(heal_amount)

func take_damage(amount: int, hit_dir: Vector3 = Vector3.ZERO) -> void:
	if _invuln_timer > 0.0:
		return
	_invuln_timer = hurt_invuln_time
	health -= amount
	if hit_dir != Vector3.ZERO:
		var dir := hit_dir.normalized()
		velocity += dir * hurt_knockback
	_screen_shake(0.3, 0.45)
	_play_damage_sound()
	Events.player_damaged.emit()
	if hud and hud.has_method("flash_damage"):
		hud.flash_damage(0.8, hurt_flash_time)
	if health <= 0:
		health = 0
		Events.player_health_changed.emit(health, max_health)
		died.emit()
	else:
		Events.player_health_changed.emit(health, max_health)

func add_ammo(amount:int) -> void:
	ammo = clamp(ammo + amount, 0, ammo_max)
	_update_hud()

func heal(amount:int) -> void:
	health = clamp(health + amount, 0, max_health)
	Events.player_health_changed.emit(health, max_health)

func _update_hud() -> void:
	if hud:
		hud.set_health(health, max_health)
		hud.set_ammo(ammo, ammo_max)
		hud.set_coins(GameState.coins)

func _spawn_muzzle_flash() -> void:
	var flash = OmniLight3D.new()
	hitscan.add_child(flash)
	flash.light_energy = 3.0
	flash.light_color = Color(1.0, 0.8, 0.3)
	flash.omni_range = 5.0

	await get_tree().create_timer(0.05).timeout
	flash.queue_free()

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

func _melee_swing_visual() -> void:
	var tween = create_tween()
	tween.tween_property(cam, "position", cam.position + Vector3(0, 0, -0.3), 0.1)
	tween.tween_property(cam, "position", _original_cam_position, 0.2)

func play_sfx(stream: AudioStream, pitch_min: float = 0.9, pitch_max: float = 1.1) -> void:
	if not stream:
		return

	var audio_player := AudioStreamPlayer3D.new()
	add_child(audio_player)
	audio_player.stream = stream
	audio_player.pitch_scale = randf_range(pitch_min, pitch_max)
	audio_player.play()
	audio_player.finished.connect(audio_player.queue_free)

func _play_gun_sound() -> void:
	play_sfx(shoot_sfx, 0.95, 1.05)

func _play_hit_sound() -> void:
	play_sfx(hit_sfx, 0.9, 1.1)

func _play_damage_sound() -> void:
	play_sfx(damage_sfx, 0.95, 1.05)

func activate_rage_mode(duration: float) -> void:
	_rage_mode_active = true
	_rage_timer = duration

	# Reduce fire_cooldown by 50%
	fire_cooldown = _original_fire_cooldown * 0.5

	# Tint DamageFlash to low-opacity Red
	if hud and hud.has_node("DamageFlash"):
		var damage_flash = hud.get_node("DamageFlash")
		damage_flash.visible = true
		damage_flash.modulate = Color(1, 0, 0, 0.15)

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
	fire_cooldown = _original_fire_cooldown

	# Clear DamageFlash tint
	if hud and hud.has_node("DamageFlash"):
		var damage_flash = hud.get_node("DamageFlash")
		damage_flash.visible = false
		damage_flash.modulate = Color(1, 0, 0, 0)
