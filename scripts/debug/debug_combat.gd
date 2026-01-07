extends Node3D

## Debug scene for testing combat in isolation
## Per RULES.md Section 6: systems must be testable in isolation

@export var enemy_scene: PackedScene
@export var player_scene: PackedScene

@onready var spawn_enemy_btn := %SpawnEnemyButton as Button
@onready var damage_player_btn := %DamagePlayerButton as Button
@onready var add_upgrade_btn := %AddUpgradeButton as Button
@onready var health_label := %HealthLabel as Label
@onready var enemy_count_label := %EnemyCountLabel as Label

var player: CharacterBody3D = null

func _ready() -> void:
	# Connect buttons
	if spawn_enemy_btn:
		spawn_enemy_btn.pressed.connect(_on_spawn_enemy)
	if damage_player_btn:
		damage_player_btn.pressed.connect(_on_damage_player)
	if add_upgrade_btn:
		add_upgrade_btn.pressed.connect(_on_add_upgrade)

func _process(_delta: float) -> void:
	_update_labels()

func _update_labels() -> void:
	if not player:
		player = get_tree().get_first_node_in_group("player")

	if player and health_label:
		var health_comp := player.get_node_or_null("HealthComponent")
		if health_comp:
			health_label.text = "Player Health: %d/%d" % [health_comp.health, health_comp.max_health]

	if enemy_count_label:
		var enemies := get_tree().get_nodes_in_group("enemies")
		enemy_count_label.text = "Enemies: %d" % enemies.size()

func _on_spawn_enemy() -> void:
	if not enemy_scene:
		print("[Debug] No enemy scene assigned")
		return

	var enemy := enemy_scene.instantiate()
	add_child(enemy)
	enemy.global_position = Vector3(randf_range(-5, 5), 1, randf_range(-5, 5))

	if player:
		enemy.initialize(player)
		enemy.wake_up()

	print("[Debug] Spawned enemy at ", enemy.global_position)

func _on_damage_player() -> void:
	if not player:
		player = get_tree().get_first_node_in_group("player")

	if player and player.has_method("take_damage"):
		player.take_damage(10, Vector3.ZERO)
		print("[Debug] Damaged player for 10")

func _on_add_upgrade() -> void:
	print("[Debug] Add upgrade feature not implemented in debug scene")
