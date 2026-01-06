extends Control

@onready var continue_button := $VBoxContainer/ContinueButton
@onready var new_game_button := $VBoxContainer/NewGameButton
@onready var load_game_button := $VBoxContainer/LoadGameButton

func _ready() -> void:
	# Show/hide continue button based on whether any save slot exists
	var has_any_save = false
	for slot in range(1, 4):
		if GameState.slot_exists(slot):
			has_any_save = true
			break

	continue_button.visible = has_any_save
	continue_button.disabled = not has_any_save

func _on_continue_pressed() -> void:
	# Continue from the most recent save slot
	var most_recent_slot = _find_most_recent_slot()
	if most_recent_slot > 0:
		GameState.load_slot(most_recent_slot)
		get_tree().change_scene_to_file("res://scenes/ui/shop.tscn")

func _find_most_recent_slot() -> int:
	# For simplicity, just find the first non-empty slot
	# You could enhance this to check modification times
	for slot in range(1, 4):
		if GameState.slot_exists(slot):
			return slot
	return 0

func _on_new_game_pressed() -> void:
	# Reset progress and start fresh (no auto-save)
	GameState.coins = 0
	for key in GameState.upgrades.keys():
		GameState.upgrades[key] = 0
	get_tree().change_scene_to_file("res://scenes/ui/shop.tscn")

func _on_load_game_pressed() -> void:
	# Go to load menu to choose a slot
	get_tree().change_scene_to_file("res://scenes/ui/load_menu.tscn")

func _on_quit_pressed() -> void:
	get_tree().quit()
