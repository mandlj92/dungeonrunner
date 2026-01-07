extends Node
class_name CameraVFX

## Camera visual effects component
## Handles screen shake and damage flash effects
## Separated from game logic per RULES.md Section 5.1

var camera: Camera3D = null

var _shake_remaining: float = 0.0
var _shake_intensity: float = 0.0
var _original_cam_position: Vector3 = Vector3.ZERO

func _ready() -> void:
	# Camera should be assigned by parent in _ready()
	pass

func _process(delta: float) -> void:
	_update_screen_shake(delta)

func screen_shake(duration: float, intensity: float) -> void:
	if not camera:
		return

	_shake_remaining = duration
	_shake_intensity = intensity

	# Store original position if not already shaking
	if _shake_remaining <= 0:
		_original_cam_position = camera.position

func _update_screen_shake(delta: float) -> void:
	if not camera:
		return

	if _shake_remaining > 0:
		_shake_remaining -= delta
		var offset := Vector3(
			randf_range(-1, 1),
			randf_range(-1, 1),
			0
		) * _shake_intensity
		camera.position = _original_cam_position + offset
	else:
		camera.position = _original_cam_position

func play_sound(stream: AudioStream, pitch_min: float = 0.9, pitch_max: float = 1.1) -> void:
	if not stream:
		return

	var parent := get_parent()
	if not parent:
		return

	var audio_player := AudioStreamPlayer3D.new()
	parent.add_child(audio_player)
	audio_player.stream = stream
	audio_player.pitch_scale = randf_range(pitch_min, pitch_max)
	audio_player.play()
	audio_player.finished.connect(audio_player.queue_free)

func damage_flash(intensity: float, duration: float) -> void:
	# This could be expanded to handle damage flash overlay
	# For now, damage flash is handled by Events.player_damage_flash_requested
	pass
