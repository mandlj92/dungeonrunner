extends Control

@onready var slot1_button := $VBoxContainer/Slot1Button
@onready var slot2_button := $VBoxContainer/Slot2Button
@onready var slot3_button := $VBoxContainer/Slot3Button
@onready var back_button := $VBoxContainer/BackButton
@onready var confirm_dialog := $ConfirmDialog

var selected_slot: int = 0

func _ready() -> void:
	_update_slot_display()
	confirm_dialog.confirmed.connect(_on_confirm_overwrite)
	confirm_dialog.canceled.connect(_on_cancel_overwrite)

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
		else:
			button.text = "Slot %d - Empty" % slot

func _on_slot1_pressed() -> void:
	_try_save_to_slot(1)

func _on_slot2_pressed() -> void:
	_try_save_to_slot(2)

func _on_slot3_pressed() -> void:
	_try_save_to_slot(3)

func _try_save_to_slot(slot: int) -> void:
	selected_slot = slot

	if GameState.slot_exists(slot):
		# Show confirmation dialog
		var summary = GameState.get_slot_summary(slot)
		confirm_dialog.dialog_text = "Overwrite Slot %d (%d Coins)?" % [slot, summary.get("coins", 0)]
		confirm_dialog.popup_centered()
	else:
		# Empty slot, save directly
		_save_to_slot(slot)

func _on_confirm_overwrite() -> void:
	_save_to_slot(selected_slot)

func _on_cancel_overwrite() -> void:
	selected_slot = 0

func _save_to_slot(slot: int) -> void:
	if GameState.save_slot(slot):
		# Show success notification
		var hud = get_tree().get_first_node_in_group("hud")
		if hud and hud.has_method("show_saved"):
			hud.show_saved("Saved to Slot %d" % slot)

		# Close the save menu and unpause
		queue_free()
		get_tree().paused = false
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	else:
		push_error("Failed to save to slot %d" % slot)

func _on_back_pressed() -> void:
	# Close save menu without saving
	queue_free()
