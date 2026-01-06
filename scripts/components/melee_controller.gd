extends Node
class_name MeleeController

## Manages melee combat with reliable hit detection using ShapeCast3D

@export var base_damage := 20
@export var cooldown := 0.5
@export var hit_sfx: AudioStream
@export var debug_mode := false

var damage := 20
var _cooldown_timer := 0.0
var _shape_cast: ShapeCast3D
var _camera: Camera3D
var _audio_parent: Node

signal melee_attempted
signal hit_landed(target: Node, damage_dealt: int)

func _ready() -> void:
	damage = base_damage

func setup(camera: Camera3D, audio_parent: Node) -> void:
	_camera = camera
	_audio_parent = audio_parent

	# Create ShapeCast3D for reliable melee hit detection
	_shape_cast = ShapeCast3D.new()
	add_child(_shape_cast)

	# Configure the shape (sphere for melee swing area)
	var sphere_shape = SphereShape3D.new()
	sphere_shape.radius = 2.0
	_shape_cast.shape = sphere_shape

	# Set cast distance
	_shape_cast.target_position = Vector3(0, 0, -3.0)

	# Set collision mask (layer 2 for enemies)
	_shape_cast.collision_mask = 2

	_shape_cast.enabled = true

func _process(delta: float) -> void:
	_cooldown_timer = max(0.0, _cooldown_timer - delta)

	# Update ShapeCast3D position and direction to match camera
	if _camera and _shape_cast:
		_shape_cast.global_transform = _camera.global_transform

func can_melee() -> bool:
	return _cooldown_timer <= 0.0

func try_melee() -> bool:
	if not can_melee():
		return false

	_cooldown_timer = cooldown
	melee_attempted.emit()

	# Force immediate collision check
	if _shape_cast:
		_shape_cast.force_shapecast_update()

		if debug_mode:
			print("[Melee] Collision count: ", _shape_cast.get_collision_count())

		# Check all collisions
		for i in range(_shape_cast.get_collision_count()):
			var collider = _shape_cast.get_collider(i)

			if debug_mode and collider:
				print("[Melee] Hit: ", collider.name, " class: ", collider.get_class())

			if collider and collider.has_method("take_damage"):
				var hit_dir = Vector3.ZERO
				if _camera:
					hit_dir = -_camera.global_transform.basis.z

				var dealt = damage
				var result = collider.take_damage(damage, hit_dir)

				# Handle return value (some enemies return actual damage dealt)
				if typeof(result) == TYPE_INT:
					dealt = result

				hit_landed.emit(collider, dealt)
				_play_hit_sound()

	return true

func set_damage(value: int) -> void:
	damage = value

func _play_hit_sound() -> void:
	if not hit_sfx or not _audio_parent:
		return

	var audio_player := AudioStreamPlayer3D.new()
	_audio_parent.add_child(audio_player)
	audio_player.stream = hit_sfx
	audio_player.pitch_scale = randf_range(0.9, 1.1)
	audio_player.play()
	audio_player.finished.connect(audio_player.queue_free)
