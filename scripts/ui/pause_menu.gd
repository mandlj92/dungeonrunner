extends Control

func _ready() -> void:
	hide()
	process_mode = Node.PROCESS_MODE_ALWAYS

func pause_game() -> void:
	show()
	get_tree().paused = true
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)

func resume_game() -> void:
	hide()
	get_tree().paused = false
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

func _on_resume_pressed() -> void:
	resume_game()

func _on_save_game_pressed() -> void:
	# Load and show the save menu
	var save_menu_scene = load("res://scenes/ui/save_menu.tscn")
	var save_menu = save_menu_scene.instantiate()
	get_tree().root.add_child(save_menu)

func _on_quit_pressed() -> void:
	get_tree().paused = false
	get_tree().change_scene_to_file("res://scenes/main.tscn")
