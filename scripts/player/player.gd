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

@export var gun_damage := 10
@export var melee_damage := 20
@export var fire_cooldown := 0.15
@export var melee_cooldown := 0.5
@export var projectile_scene: PackedScene

@export var hurt_invuln_time := 0.6
@export var hurt_knockback := 7.0
@export var hurt_flash_time := 0.25
@export var debug_melee := false

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
	max_health = base_max_health + (GameState.upgrades["max_health"] * 10)
	health = max_health

	ammo_max = base_ammo_max + (GameState.upgrades["ammo_max"] * 5)
	ammo = ammo_max

	base_speed *= (1.0 + 0.03 * GameState.upgrades["move_speed"])
	melee_damage = int(melee_damage * (1.0 + 0.10 * GameState.upgrades["melee_damage"]))
	gun_damage = int(gun_damage * (1.0 + 0.10 * GameState.upgrades["gun_damage"]))

func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * mouse_sens)
		head.rotate_x(-event.relative.y * mouse_sens)
		head.rotation.x = clamp(head.rotation.x, deg_to_rad(-80), deg_to_rad(80))

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

	# Apply gravity
	if not is_on_floor():
		velocity.y -= gravity * delta

	# Jump
	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = jump_velocity

	move_and_slide()

	# falling / death plane: if the player falls below the threshold and stays
	# below for `fall_death_time` seconds, count as death
	if global_transform.origin.y < fall_death_threshold:
		_fall_timer += delta
		if _fall_timer >= fall_death_time:
			emit_signal("died")
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

	# Spawn projectile
	var projectile = projectile_scene.instantiate()
	get_parent().add_child(projectile)
	projectile.global_position = hitscan.global_position
	projectile.direction = -cam.global_transform.basis.z
	projectile.damage = gun_damage
	projectile.shooter = self

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
	var lvl: int = GameState.upgrades.get("lifesteal", 0)
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
	if hud and hud.has_method("flash_damage"):
		hud.flash_damage(0.8, hurt_flash_time)
	if health <= 0:
		health = 0
		_update_hud()
		emit_signal("died")
	else:
		_update_hud()

func add_ammo(amount:int) -> void:
	ammo = clamp(ammo + amount, 0, ammo_max)
	_update_hud()

func heal(amount:int) -> void:
	health = clamp(health + amount, 0, max_health)
	_update_hud()

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

func _play_gun_sound() -> void:
	var player = AudioStreamPlayer3D.new()
	add_child(player)

	var gen = AudioStreamGenerator.new()
	gen.mix_rate = 44100
	player.stream = gen
	player.play()

	var playback = player.get_stream_playback() as AudioStreamGeneratorPlayback
	for i in range(2000):
		var sample = randf_range(-1.0, 1.0) * exp(-i/500.0)
		playback.push_frame(Vector2(sample, sample))

	await get_tree().create_timer(0.1).timeout
	player.queue_free()

func _play_hit_sound() -> void:
	var player = AudioStreamPlayer3D.new()
	add_child(player)

	var gen = AudioStreamGenerator.new()
	gen.mix_rate = 22050
	player.stream = gen
	player.play()

	var playback = player.get_stream_playback() as AudioStreamGeneratorPlayback
	for i in range(1000):
		var sample = randf_range(-0.5, 0.5) * exp(-i/200.0)
		playback.push_frame(Vector2(sample, sample))

	await get_tree().create_timer(0.1).timeout
	player.queue_free()

func _play_damage_sound() -> void:
	var player = AudioStreamPlayer3D.new()
	add_child(player)

	var gen = AudioStreamGenerator.new()
	gen.mix_rate = 16000
	player.stream = gen
	player.play()

	var playback = player.get_stream_playback() as AudioStreamGeneratorPlayback
	for i in range(1800):
		var sample = sin(i * 0.12) * exp(-i/400.0) * -0.6
		playback.push_frame(Vector2(sample, sample))

	await get_tree().create_timer(0.15).timeout
	player.queue_free()

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
