extends Node3D

@onready var world := $World
@onready var nav := $NavigationRegion3D
@onready var hud_layer := $HUD

@export var player_scene: PackedScene
@export var enemy_scene: PackedScene
@export var pickup_scene: PackedScene
@export var room_scene: PackedScene
@export var portal_scene: PackedScene

var player

func _ready() -> void:
	randomize()
	var seed = GameState.new_run_seed()

	# generate dungeon
	var gen = ProcGen.new()
	gen.room_scene = room_scene
	gen.room_count = 10
	var data = gen.generate(world, seed)

	# bake navigation after generation
	await get_tree().process_frame
	nav.bake_navigation_mesh()

	# spawn player in first room
	player = player_scene.instantiate()
	add_child(player)
	player.died.connect(_on_player_died)
	player.exited.connect(_on_player_exited)

	var first_room = data["rooms"][0]
	var sp = first_room.get_node("SpawnPoint") as Marker3D
	player.global_position = sp.global_position + Vector3(0,1,0)

	# spawn enemies/pickups with difficulty scaling
	var difficulty_scale = _get_difficulty_scale()
	for i in range(1, data["rooms"].size()):
		var room = data["rooms"][i]

		# More enemies spawn at higher levels
		var enemy_chance = min(0.8 + (GameState.dungeon_level - 1) * 0.05, 1.0)
		if randf() < enemy_chance:
			var e = enemy_scene.instantiate()
			add_child(e)
			e.global_position = (room.get_node("EnemySpawn") as Marker3D).global_position + Vector3(0,1,0)
			# Scale enemy stats based on dungeon level
			_scale_enemy(e, difficulty_scale)
			# 10% chance to make enemy Elite
			if randf() < 0.1:
				_make_elite(e)

		if randf() < 0.7:
			var p = pickup_scene.instantiate()
			add_child(p)
			p.global_position = (room.get_node("PickupSpawn") as Marker3D).global_position + Vector3(0,1,0)

	# spawn exit portal in final room (use exported scene or fallback to default)
	var portal_packed: PackedScene = portal_scene
	if not portal_packed:
		var fallback_path := "res://scenes/world/exit_portal.tscn"
		if ResourceLoader.exists(fallback_path):
			portal_packed = load(fallback_path) as PackedScene

	if portal_packed:
		var final_room = data["final_room"]
		var portal = portal_packed.instantiate()
		add_child(portal)
		portal.global_position = (final_room.get_node("ExitSpawn") as Marker3D).global_position + Vector3(0,1,0)

func _get_difficulty_scale() -> Dictionary:
	var level = GameState.dungeon_level
	return {
		"health": 1.0 + (level - 1) * 0.15,  # +15% HP per level
		"damage": 1.0 + (level - 1) * 0.10,  # +10% damage per level
		"speed": 1.0 + (level - 1) * 0.05,   # +5% speed per level
		"coins": 1 + (level - 1) * 2         # +2 coins per level
	}

func _scale_enemy(enemy: Node, difficulty_multipliers: Dictionary) -> void:
	if "max_health" in enemy:
		enemy.max_health = int(enemy.max_health * difficulty_multipliers.health)
		enemy.health = enemy.max_health
	if "damage" in enemy:
		enemy.damage = int(enemy.damage * difficulty_multipliers.damage)
	if "speed" in enemy:
		enemy.speed = enemy.speed * difficulty_multipliers.speed

func _make_elite(enemy: Node) -> void:
	# Mark as elite for coin drops
	enemy.set_meta("is_elite", true)

	# Scale model by 1.5x
	if enemy.has_node("MeshInstance3D"):
		var mesh = enemy.get_node("MeshInstance3D")
		mesh.scale = Vector3(1.5, 1.5, 1.5)

	# Multiply max_health by 3
	if "max_health" in enemy:
		enemy.max_health = int(enemy.max_health * 3)
		enemy.health = enemy.max_health

	# Multiply damage by 2
	if "damage" in enemy:
		enemy.damage = int(enemy.damage * 2)

	# Change color to Red
	if enemy.has_node("MeshInstance3D"):
		var mesh = enemy.get_node("MeshInstance3D")
		if mesh.mesh:
			var mat = StandardMaterial3D.new()
			mat.albedo_color = Color.RED
			mesh.set_surface_override_material(0, mat)

func _on_player_died() -> void:
	GameState.reset_run()  # Reset to level 1 on death
	GameState.save_game()  # Save coins and progress
	get_tree().change_scene_to_file("res://scenes/summary.tscn")

func _on_player_exited() -> void:
	GameState.advance_dungeon()  # Advance to next level
	GameState.save_game()  # Save coins and progress
	get_tree().change_scene_to_file("res://scenes/summary.tscn")
