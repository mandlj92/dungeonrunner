extends Node
class_name ProcGen

@export var room_scene: PackedScene
@export var connector_scene: PackedScene
@export var room_count := 10
@export var spacing := 40.0  # Increased for 24x24 rooms

## Pool of room templates to choose from during generation
@export var room_templates: Array[RoomTemplate] = []

func generate(parent: Node3D, rng_seed: int) -> Dictionary:
	var rng = RandomNumberGenerator.new()
	rng.seed = rng_seed

	var rooms := []
	var positions := []
	var room_valid_floors := {}  # Dictionary mapping room index to Array[Vector3]
	var current := Vector2i(0,0)
	positions.append(current)

	# random walk
	for i in range(room_count - 1):
		var dir = [Vector2i(1,0), Vector2i(-1,0), Vector2i(0,1), Vector2i(0,-1)][rng.randi_range(0,3)]
		current += dir
		if not positions.has(current):
			positions.append(current)

	# instantiate and build rooms
	var room_builder := RoomBuilder.new()
	for i in range(positions.size()):
		var p = positions[i]
		var r = room_scene.instantiate()
		parent.add_child(r)
		r.global_position = Vector3(p.x * spacing, 0, p.y * spacing)
		rooms.append(r)

		# Select room template based on depth and availability
		var selected_template := _select_room_template(i, rng)

		# Store template in room for later use (enemy spawning, etc.)
		if r.has_method("set") and selected_template:
			r.template = selected_template
			print("[ProcGen] Room %d using template: %s" % [i, selected_template.template_name])

		# Generate internal layout using RoomBuilder
		var gridmap := r.get_node("GridMap") as GridMap
		if gridmap:
			var room_offset := Vector3(p.x * spacing, 0, p.y * spacing)
			var valid_floors := room_builder.generate_room_layout(gridmap, room_offset, rng, selected_template)
			room_valid_floors[i] = valid_floors

			# Store valid floor positions in room
			if r.has_method("set"):
				r.valid_floor_positions = valid_floors

	# create simple connectors (static platforms) between adjacent rooms
	# so the player can traverse between rooms on the same Y level
	if connector_scene:
		for i in range(rooms.size()):
			for j in range(i + 1, rooms.size()):
				var a_pos = positions[i]
				var b_pos = positions[j]
				var diff = b_pos - a_pos
				# Manhattan distance 1 => adjacent on grid
				if abs(diff.x) + abs(diff.y) == 1:
					var a_world = rooms[i].global_position
					var b_world = rooms[j].global_position
					var center = (a_world + b_world) * 0.5

					# Instantiate connector scene
					var conn = connector_scene.instantiate()
					conn.name = "Connector_%d_%d" % [i, j]
					parent.add_child(conn)
					conn.global_position = center

					# Scale the connector based on orientation
					if diff.x != 0:
						# Horizontal connector
						conn.scale = Vector3(spacing * 0.6 / 24.0, 1.0, spacing * 0.9 / 24.0)
					else:
						# Vertical connector
						conn.scale = Vector3(spacing * 0.9 / 24.0, 1.0, spacing * 0.6 / 24.0)


	return {
		"rooms": rooms,
		"positions": positions,
		"final_room": rooms[-1],
		"room_valid_floors": room_valid_floors
	}

## Select a room template based on current room depth
## Filters templates by min_depth and prevents repeating the same type consecutively
func _select_room_template(room_index: int, rng: RandomNumberGenerator) -> RoomTemplate:
	# If no templates configured, return null (uses defaults)
	if room_templates.is_empty():
		return null

	# Filter templates that are available at this depth
	var available: Array[RoomTemplate] = []
	for template in room_templates:
		if template and template.min_depth <= room_index:
			available.append(template)

	# Fallback to all templates if filtering removes everything
	if available.is_empty():
		available = room_templates.duplicate()

	# Select random template from available pool
	var index := rng.randi_range(0, available.size() - 1)
	return available[index]
