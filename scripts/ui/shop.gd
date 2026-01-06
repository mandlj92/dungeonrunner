extends Control

# Upgrade costs scale with level: base_cost * (1 + level)
const UPGRADE_COSTS := {
	GameState.UpgradeType.MAX_HEALTH: 10,
	GameState.UpgradeType.MOVE_SPEED: 15,
	GameState.UpgradeType.MELEE_DAMAGE: 12,
	GameState.UpgradeType.GUN_DAMAGE: 12,
	GameState.UpgradeType.AMMO_MAX: 8,
	GameState.UpgradeType.LIFESTEAL: 20
}

const UPGRADE_LABELS := {
	GameState.UpgradeType.MAX_HEALTH: "Max Health (+10)",
	GameState.UpgradeType.MOVE_SPEED: "Move Speed (+3%)",
	GameState.UpgradeType.MELEE_DAMAGE: "Melee Damage (+10%)",
	GameState.UpgradeType.GUN_DAMAGE: "Gun Damage (+10%)",
	GameState.UpgradeType.AMMO_MAX: "Ammo Capacity (+5)",
	GameState.UpgradeType.LIFESTEAL: "Lifesteal (+1%)"
}

@onready var coins_label := $VBoxContainer/CoinsLabel
@onready var upgrade_grid := $VBoxContainer/UpgradeGrid
@onready var start_button := $VBoxContainer/StartButton

func _ready() -> void:
	_create_upgrade_buttons()
	_update_display()
	start_button.pressed.connect(_on_start_run_pressed)

func _create_upgrade_buttons() -> void:
	for upgrade_type in UPGRADE_COSTS.keys():
		var btn = Button.new()
		# Use enum name as button name (convert enum value to string)
		btn.name = GameState.UpgradeType.keys()[upgrade_type]
		btn.pressed.connect(_on_upgrade_pressed.bind(upgrade_type))
		upgrade_grid.add_child(btn)

func _update_display() -> void:
	coins_label.text = "Coins: %d" % GameState.coins
	for upgrade_type in UPGRADE_COSTS.keys():
		# Get button by enum name
		var btn = upgrade_grid.get_node(GameState.UpgradeType.keys()[upgrade_type]) as Button
		var level = GameState.upgrades[upgrade_type]
		var cost = _get_cost(upgrade_type)
		btn.text = "%s [Lv%d] - %d coins" % [UPGRADE_LABELS[upgrade_type], level, cost]
		btn.disabled = (GameState.coins < cost)

func _get_cost(upgrade_type: GameState.UpgradeType) -> int:
	return UPGRADE_COSTS[upgrade_type] * (1 + GameState.upgrades[upgrade_type])

func _on_upgrade_pressed(upgrade_type: GameState.UpgradeType) -> void:
	var cost = _get_cost(upgrade_type)
	if GameState.spend_coins(cost):
		GameState.upgrades[upgrade_type] += 1
		# persist upgrade immediately
		if GameState.has_method("save_game"):
			GameState.save_game()
		_update_display()

func _on_start_run_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/world/run.tscn")
