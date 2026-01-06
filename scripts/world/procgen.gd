extends Node
class_name ProcGen

@export var room_scene: PackedScene
@export var room_count := 10
@export var spacing := 18.0

func generate(parent: Node3D, rng_seed: int) -> Dictionary:
	var rng = RandomNumberGenerator.new()
	rng.seed = rng_seed

	var rooms := []
	var positions := []
	var current := Vector2i(0,0)
	positions.append(current)

	# random walk
	for i in range(room_count - 1):
		var dir = [Vector2i(1,0), Vector2i(-1,0), Vector2i(0,1), Vector2i(0,-1)][rng.randi_range(0,3)]
		current += dir
		if not positions.has(current):
			positions.append(current)

	# instantiate
	for p in positions:
		var r = room_scene.instantiate()
		parent.add_child(r)
		r.global_position = Vector3(p.x * spacing, 0, p.y * spacing)
		rooms.append(r)

	# create simple connectors (static platforms) between adjacent rooms
	# so the player can traverse between rooms on the same Y level
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
				# create a StaticBody3D with a box mesh + collision
				var conn = StaticBody3D.new()
				conn.name = "Connector_%d_%d" % [i, j]
				parent.add_child(conn)
				conn.global_position = center

				var mesh = MeshInstance3D.new()
				var box = BoxMesh.new()
				# size the box depending on orientation
				if diff.x != 0:
					box.size = Vector3(spacing * 0.6, 1.0, spacing * 0.9)
				else:
					box.size = Vector3(spacing * 0.9, 1.0, spacing * 0.6)
				mesh.mesh = box
				conn.add_child(mesh)

				var col = CollisionShape3D.new()
				var shape = BoxShape3D.new()
				shape.size = box.size
				col.shape = shape
				conn.add_child(col)


	return {
		"rooms": rooms,
		"positions": positions,
		"final_room": rooms[-1]
	}
