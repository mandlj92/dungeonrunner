extends Control

@onready var slot_labels = [
    $Panel/VBox/SlotRow1/SlotLabel1,
    $Panel/VBox/SlotRow2/SlotLabel2,
    $Panel/VBox/SlotRow3/SlotLabel3
]
@onready var load_buttons = [
    $Panel/VBox/SlotRow1/Load1,
    $Panel/VBox/SlotRow2/Load2,
    $Panel/VBox/SlotRow3/Load3
]
@onready var save_buttons = [
    $Panel/VBox/SlotRow1/Save1,
    $Panel/VBox/SlotRow2/Save2,
    $Panel/VBox/SlotRow3/Save3
]
@onready var delete_buttons = [
    $Panel/VBox/SlotRow1/Delete1,
    $Panel/VBox/SlotRow2/Delete2,
    $Panel/VBox/SlotRow3/Delete3
]
@onready var back_button = $Panel/VBox/Back

func _ready() -> void:
    for i in range(3):
        load_buttons[i].pressed.connect(_on_load_pressed.bind(i + 1))
        save_buttons[i].pressed.connect(_on_save_pressed.bind(i + 1))
        delete_buttons[i].pressed.connect(_on_delete_pressed.bind(i + 1))
    back_button.pressed.connect(_on_back_pressed)
    _refresh_slot_labels()

func _refresh_slot_labels() -> void:
    for i in range(3):
        var slot = i + 1
        if GameState.slot_exists(slot):
            var s = GameState.get_slot_summary(slot)
            var coins = s.has("coins") ? s.coins : 0
            var ver = s.has("version") ? s.version : 0
            slot_labels[i].text = "Slot %d: Coins: %d  (v%d)" % [slot, coins, ver]
        else:
            slot_labels[i].text = "Slot %d: Empty" % slot

func _on_save_pressed(slot: int) -> void:
    var ok = GameState.save_slot(slot)
    if ok:
        _refresh_slot_labels()
    else:
        push_error("Failed to save slot %d" % slot)

func _on_load_pressed(slot: int) -> void:
    if not GameState.slot_exists(slot):
        print("No save in slot %d" % slot)
        return
    var ok = GameState.load_slot(slot)
    if ok:
        get_tree().change_scene_to_file("res://scenes/main.tscn")
    else:
        push_error("Failed to load slot %d" % slot)

func _on_delete_pressed(slot: int) -> void:
    var ok = GameState.delete_slot(slot)
    if ok:
        _refresh_slot_labels()
    else:
        push_error("Failed to delete slot %d" % slot)

func _on_back_pressed() -> void:
    get_tree().change_scene_to_file("res://scenes/main.tscn")
