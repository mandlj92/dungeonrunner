extends Node
class_name WeaponController

## Manages ranged weapon firing, ammo, and projectile spawning

@export var base_ammo_max := 30
@export var base_damage := 10
@export var fire_cooldown := 0.15
@export var projectile_scene: PackedScene
@export var shoot_sfx: AudioStream
@export var muzzle_flash_enabled := true

var ammo_max := 30
var ammo := 30
var damage := 10

var _fire_timer := 0.0
var _muzzle_flash_light: OmniLight3D
var _camera: Camera3D
var _raycast: RayCast3D
var _audio_parent: Node

signal fired(spawn_transform: Transform3D, damage_amount: int)
signal ammo_changed(current: int, maximum: int)

func _ready() -> void:
	ammo = ammo_max
	damage = base_damage

func setup(camera: Camera3D, raycast: RayCast3D, audio_parent: Node) -> void:
	_camera = camera
	_raycast = raycast
	_audio_parent = audio_parent

	# Create cached muzzle flash light
	if muzzle_flash_enabled and _raycast:
		_muzzle_flash_light = OmniLight3D.new()
		_raycast.add_child(_muzzle_flash_light)
		_muzzle_flash_light.light_energy = 3.0
		_muzzle_flash_light.light_color = Color(1.0, 0.8, 0.3)
		_muzzle_flash_light.omni_range = 5.0
		_muzzle_flash_light.visible = false

func _process(delta: float) -> void:
	_fire_timer = max(0.0, _fire_timer - delta)

func can_fire() -> bool:
	return _fire_timer <= 0.0 and ammo > 0 and projectile_scene != null

func try_fire() -> bool:
	if not can_fire():
		return false

	_fire_timer = fire_cooldown
	ammo -= 1
	ammo_changed.emit(ammo, ammo_max)

	if muzzle_flash_enabled:
		_spawn_muzzle_flash()

	if shoot_sfx and _audio_parent:
		_play_gun_sound()

	# Create spawn transform
	var spawn_transform := Transform3D()
	if _raycast:
		spawn_transform.origin = _raycast.global_position
	if _camera:
		spawn_transform.basis = _camera.global_transform.basis

	# Emit signal for projectile spawning (decoupled from Events autoload)
	fired.emit(spawn_transform, damage)

	return true

func add_ammo(amount: int) -> void:
	ammo = clamp(ammo + amount, 0, ammo_max)
	ammo_changed.emit(ammo, ammo_max)

func set_ammo_max(value: int) -> void:
	ammo_max = value
	ammo = mini(ammo, ammo_max)
	ammo_changed.emit(ammo, ammo_max)

func set_damage(value: int) -> void:
	damage = value

func apply_rage_mode(multiplier: float = 0.5) -> void:
	fire_cooldown = base_damage * multiplier

func reset_fire_rate() -> void:
	fire_cooldown = base_damage

func _spawn_muzzle_flash() -> void:
	if not _muzzle_flash_light:
		return

	_muzzle_flash_light.visible = true
	await get_tree().create_timer(0.05).timeout
	if _muzzle_flash_light:
		_muzzle_flash_light.visible = false

func _play_gun_sound() -> void:
	if not shoot_sfx or not _audio_parent:
		return

	var audio_player := AudioStreamPlayer3D.new()
	_audio_parent.add_child(audio_player)
	audio_player.stream = shoot_sfx
	audio_player.pitch_scale = randf_range(0.95, 1.05)
	audio_player.play()
	audio_player.finished.connect(audio_player.queue_free)
