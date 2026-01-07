extends Control
class_name Reticle

## Dynamic crosshair that expands when firing weapons
## Listens to Events.weapon_fired for visual feedback

@export var spread_distance: float = 15.0
@export var base_distance: float = 8.0
@export var spread_duration: float = 0.05
@export var return_duration: float = 0.2

@onready var horizontal_line: ColorRect = $HorizontalLine
@onready var vertical_line: ColorRect = $VerticalLine

func _ready() -> void:
	Events.weapon_fired.connect(_on_weapon_fired)

func _on_weapon_fired() -> void:
	# "Juice" implementation - Rule 5.1: Visual feedback only
	var tween = create_tween().set_parallel(true)

	# Expand horizontal line
	if horizontal_line:
		tween.tween_property(horizontal_line, "offset_left", -spread_distance, spread_duration).set_ease(Tween.EASE_OUT)
		tween.tween_property(horizontal_line, "offset_right", spread_distance, spread_duration).set_ease(Tween.EASE_OUT)

	# Expand vertical line
	if vertical_line:
		tween.tween_property(vertical_line, "offset_top", -spread_distance, spread_duration).set_ease(Tween.EASE_OUT)
		tween.tween_property(vertical_line, "offset_bottom", spread_distance, spread_duration).set_ease(Tween.EASE_OUT)

	# Chain the return animation
	await tween.finished

	var return_tween = create_tween().set_parallel(true)

	# Return horizontal line
	if horizontal_line:
		return_tween.tween_property(horizontal_line, "offset_left", -base_distance, return_duration).set_ease(Tween.EASE_IN)
		return_tween.tween_property(horizontal_line, "offset_right", base_distance, return_duration).set_ease(Tween.EASE_IN)

	# Return vertical line
	if vertical_line:
		return_tween.tween_property(vertical_line, "offset_top", -base_distance, return_duration).set_ease(Tween.EASE_IN)
		return_tween.tween_property(vertical_line, "offset_bottom", base_distance, return_duration).set_ease(Tween.EASE_IN)
