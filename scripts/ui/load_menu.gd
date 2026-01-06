extends Control

@onready var slot1_button := $VBoxContainer/Slot1Button
@onready var slot2_button := $VBoxContainer/Slot2Button
@onready var slot3_button := $VBoxContainer/Slot3Button
@onready var back_button := $VBoxContainer/BackButton

func _ready() -> void:
	_update_slot_display()

func _update_slot_display() -> void:
	for slot in range(1, 4):
		var button: Button
		match slot:
			1: button = slot1_button
			2: button = slot2_button
			3: button = slot3_button

		if GameState.slot_exists(slot):
			var summary = GameState.get_slot_summary(slot)
			button.text = "Slot %d - %d Coins" % [slot, summary.get("coins", 0)]
			button.disabled = false
		else:
			button.text = "Slot %d - Empty" % slot
			button.disabled = true

func _on_slot1_pressed() -> void:
	_load_slot(1)

func _on_slot2_pressed() -> void:
	_load_slot(2)

func _on_slot3_pressed() -> void:
	_load_slot(3)

func _load_slot(slot: int) -> void:
	if GameState.load_slot(slot):
		get_tree().change_scene_to_file("res://scenes/ui/shop.tscn")
	else:
		push_error("Failed to load slot %d" % slot)

func _on_back_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/main.tscn")
