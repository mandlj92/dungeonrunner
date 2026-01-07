extends Node3D

@onready var world := $World
@onready var nav := $NavigationRegion3D
@onready var hud_layer := $HUD

@export var player_scene: PackedScene
@export var enemy_scene: PackedScene
@export var pickup_scene: PackedScene
@export var room_scene: PackedScene
@export var portal_scene: PackedScene

@export_group("Room Templates")
@export var arena_template: RoomTemplate
@export var narrow_template: RoomTemplate
@export var pillars_template: RoomTemplate

var player

func _ready() -> void:
	# Critical asset checks
	assert(portal_scene != null, "Critical: Portal Scene is not assigned in RunController!")

	randomize()
	var rng_seed = GameState.new_run_seed()

	# Connect to projectile spawn signal
	Events.spawn_projectile.connect(_on_spawn_projectile)

	# generate dungeon
	var gen = ProcGen.new()
	gen.room_scene = room_scene
	gen.room_count = 10

	# Assign room templates for variety (if configured)
	var templates: Array[RoomTemplate] = []
	if arena_template:
		templates.append(arena_template)
	if narrow_template:
		templates.append(narrow_template)
	if pillars_template:
		templates.append(pillars_template)
	gen.room_templates = templates

	var data = gen.generate(world, rng_seed)

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
	var room_valid_floors = data.get("room_valid_floors", {})

	for i in range(1, data["rooms"].size()):
		var room = data["rooms"][i]
		var valid_floors: Array = room_valid_floors.get(i, [])

		# Determine enemy count from room template (or use defaults)
		var min_enemies := 3
		var max_enemies := 6
		if room.template != null:
			min_enemies = room.template.min_enemies
			max_enemies = room.template.max_enemies

		var enemy_count := randi_range(min_enemies, max_enemies)

		# Ensure we have enough valid positions
		if valid_floors.size() > 0:
			for enemy_idx in range(enemy_count):
				# More enemies spawn at higher levels
				var enemy_chance = min(0.8 + (GameState.dungeon_level - 1) * 0.05, 1.0)
				if randf() < enemy_chance:
					var e = enemy_scene.instantiate()
					room.add_child(e)

					# Pick random valid floor position
					var spawn_pos: Vector3 = valid_floors[randi() % valid_floors.size()]
					e.global_position = spawn_pos + Vector3(0, 1, 0)

					# Initialize with player reference
					e.initialize(player)

					# Scale enemy stats based on dungeon level
					_scale_enemy(e, difficulty_scale)

					# 10% chance to make enemy Elite
					if randf() < 0.1:
						_make_elite(e)
		else:
			# Fallback: spawn at room center with warning
			push_warning("No valid floors found for room %d, using fallback spawn position" % i)
			for enemy_idx in range(enemy_count):
				var enemy_chance = min(0.8 + (GameState.dungeon_level - 1) * 0.05, 1.0)
				if randf() < enemy_chance:
					var e = enemy_scene.instantiate()
					room.add_child(e)

					# Fallback to room's global position + offset
					e.global_position = room.global_position + Vector3(0, 1, 0)

					e.initialize(player)
					_scale_enemy(e, difficulty_scale)

					if randf() < 0.1:
						_make_elite(e)

		# Spawn pickups
		if randf() < 0.7:
			var p = pickup_scene.instantiate()
			add_child(p)

			if valid_floors.size() > 0:
				var spawn_pos: Vector3 = valid_floors[randi() % valid_floors.size()]
				p.global_position = spawn_pos + Vector3(0, 1, 0)
			else:
				# Fallback for pickups: try marker first, then room center
				push_warning("No valid floors found for pickup in room %d, using fallback spawn position" % i)
				if room.has_node("PickupSpawn"):
					p.global_position = (room.get_node("PickupSpawn") as Marker3D).global_position + Vector3(0, 1, 0)
				else:
					p.global_position = room.global_position + Vector3(0, 1, 0)

	# spawn exit portal in final room
	var final_room = data["final_room"]
	var portal = portal_scene.instantiate()
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
	if enemy.has_node("HealthComponent"):
		var health_comp := enemy.get_node("HealthComponent")
		health_comp.max_health = int(health_comp.max_health * difficulty_multipliers.health)
		health_comp.health = health_comp.max_health
	if "damage" in enemy:
		enemy.damage = int(enemy.damage * difficulty_multipliers.damage)
	if "speed" in enemy:
		enemy.speed = enemy.speed * difficulty_multipliers.speed

func _make_elite(enemy: Node) -> void:
	# Mark as elite for coin drops
	enemy.set_meta("is_elite", true)

	# Scale model by 1.5x
	if enemy.has_node("MeshInstance3D"):
		var mesh := enemy.get_node("MeshInstance3D")
		mesh.scale = Vector3(1.5, 1.5, 1.5)

	# Multiply max_health by 3
	if enemy.has_node("HealthComponent"):
		var health_comp := enemy.get_node("HealthComponent")
		health_comp.max_health = int(health_comp.max_health * 3)
		health_comp.health = health_comp.max_health

	# Multiply damage by 2
	if "damage" in enemy:
		enemy.damage = int(enemy.damage * 2)

	# Change elite appearance via VFX component
	if enemy.has_node("VFXComponent"):
		var vfx := enemy.get_node("VFXComponent")
		if vfx.has_method("set_elite_appearance"):
			vfx.set_elite_appearance()

func _on_player_died() -> void:
	GameState.reset_run()  # Reset to level 1 on death
	GameState.save_game()  # Save coins and progress
	_queue_summary_scene_change()

func _on_player_exited() -> void:
	GameState.advance_dungeon()  # Advance to next level
	GameState.save_game()  # Save coins and progress
	_queue_summary_scene_change()

func _queue_summary_scene_change() -> void:
	# Defer scene change so we don't remove physics bodies during callbacks (e.g. portal overlap)
	get_tree().call_deferred("change_scene_to_file", "res://scenes/summary.tscn")

func _on_spawn_projectile(scene: PackedScene, spawn_transform: Transform3D, damage: int, shooter: Node) -> void:
	var projectile = scene.instantiate()
	world.add_child(projectile)
	projectile.global_transform = spawn_transform
	projectile.direction = -spawn_transform.basis.z
	projectile.damage = damage
	projectile.shooter = shooter

	# Trigger ON_SHOOT upgrades if shooter has UpgradeManager
	if shooter and shooter.has_node("UpgradeManager"):
		var upgrade_manager = shooter.get_node("UpgradeManager")
		if upgrade_manager.has_method("trigger_upgrades"):
			var context = {"projectile": projectile}
			upgrade_manager.trigger_upgrades(UpgradeEffect.TriggerType.ON_SHOOT, context)
