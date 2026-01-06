extends Control

# Upgrade costs scale with level: base_cost * (1 + level)
const UPGRADE_COSTS := {
	"max_health": 10,
	"move_speed": 15,
	"melee_damage": 12,
	"gun_damage": 12,
	"ammo_max": 8,
	"lifesteal": 20
}

const UPGRADE_LABELS := {
	"max_health": "Max Health (+10)",
	"move_speed": "Move Speed (+3%)",
	"melee_damage": "Melee Damage (+10%)",
	"gun_damage": "Gun Damage (+10%)",
	"ammo_max": "Ammo Capacity (+5)",
	"lifesteal": "Lifesteal (+1%)"
}

@onready var title_label := $VBoxContainer/TitleLabel
@onready var level_label := $VBoxContainer/LevelLabel
@onready var coins_label := $VBoxContainer/CoinsLabel
@onready var upgrade_grid := $VBoxContainer/UpgradeGrid
@onready var start_button := $VBoxContainer/StartButton

func _ready() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	_create_upgrade_buttons()
	_update_display()

	# Update title based on whether player died or completed
	if GameState.dungeon_level == 1:
		title_label.text = "GAME OVER - Run Reset"
		start_button.text = "Start New Run"
	else:
		title_label.text = "DUNGEON COMPLETE"
		start_button.text = "Enter Next Dungeon"

func _create_upgrade_buttons() -> void:
	for key in UPGRADE_COSTS.keys():
		var btn = Button.new()
		btn.name = key
		btn.pressed.connect(_on_upgrade_pressed.bind(key))
		upgrade_grid.add_child(btn)

func _update_display() -> void:
	level_label.text = "Dungeon Level %d (Best: %d)" % [GameState.dungeon_level, GameState.max_dungeon_reached]
	coins_label.text = "Coins: %d" % GameState.coins
	for key in UPGRADE_COSTS.keys():
		var btn = upgrade_grid.get_node(key) as Button
		var level = GameState.upgrades[key]
		var cost = _get_cost(key)
		btn.text = "%s [Lv%d] - %d coins" % [UPGRADE_LABELS[key], level, cost]
		btn.disabled = (GameState.coins < cost)

func _get_cost(key: String) -> int:
	return UPGRADE_COSTS[key] * (1 + GameState.upgrades[key])

func _on_upgrade_pressed(key: String) -> void:
	var cost = _get_cost(key)
	if GameState.spend_coins(cost):
		GameState.upgrades[key] += 1
		# persist upgrade immediately
		if GameState.has_method("save_game"):
			GameState.save_game()
		_update_display()

func _on_start_run_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/world/run.tscn")

func _on_menu_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/main.tscn")
