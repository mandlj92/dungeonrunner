extends RefCounted
class_name RoomBuilder

const ROOM_SIZE := 24
const WALL_TILE_ID := 0
const FLOOR_TILE_ID := -1  # Empty cell in GridMap

# Door positions (center of each side)
const DOOR_NORTH := Vector2i(ROOM_SIZE / 2, 0)
const DOOR_SOUTH := Vector2i(ROOM_SIZE / 2, ROOM_SIZE - 1)
const DOOR_EAST := Vector2i(ROOM_SIZE - 1, ROOM_SIZE / 2)
const DOOR_WEST := Vector2i(0, ROOM_SIZE / 2)
const DOOR_BUFFER := 3  # Keep 3 tiles clear around doors

## Generates internal room layout using cellular automata
## Returns array of valid floor positions (in local room coordinates)
func generate_room_layout(gridmap: GridMap, room_offset: Vector3, rng: RandomNumberGenerator) -> Array[Vector3]:
	var grid := _initialize_grid(rng)

	# Run cellular automata simulation
	for iteration in range(4):
		grid = _cellular_automata_step(grid)

	# Clear areas around doors to ensure accessibility
	_clear_door_areas(grid)

	# Apply the grid to the GridMap and collect valid floor positions
	var valid_positions: Array[Vector3] = []

	for x in range(ROOM_SIZE):
		for z in range(ROOM_SIZE):
			var cell_pos := Vector3i(
				int(room_offset.x) + x,
				int(room_offset.y),
				int(room_offset.z) + z
			)

			if grid[x][z] == WALL_TILE_ID:
				# Place wall tile
				gridmap.set_cell_item(cell_pos, WALL_TILE_ID)
			else:
				# Empty cell = floor, record as valid spawn position
				var world_pos := Vector3(
					room_offset.x + x,
					room_offset.y,
					room_offset.z + z
				)
				valid_positions.append(world_pos)

	return valid_positions

## Initialize grid with random noise
func _initialize_grid(rng: RandomNumberGenerator) -> Array:
	var grid := []
	for x in range(ROOM_SIZE):
		var row := []
		for z in range(ROOM_SIZE):
			# 45% chance of wall
			var cell = WALL_TILE_ID if rng.randf() < 0.45 else FLOOR_TILE_ID
			row.append(cell)
		grid.append(row)
	return grid

## Apply one step of cellular automata (Game of Life style rules)
func _cellular_automata_step(grid: Array) -> Array:
	var new_grid := []

	for x in range(ROOM_SIZE):
		var row := []
		for z in range(ROOM_SIZE):
			var wall_neighbors := _count_wall_neighbors(grid, x, z)

			# Rules: If 5+ neighbors are walls, become wall. If 4 or fewer, become floor.
			if wall_neighbors >= 5:
				row.append(WALL_TILE_ID)
			else:
				row.append(FLOOR_TILE_ID)
		new_grid.append(row)

	return new_grid

## Count how many neighboring cells are walls (including diagonals)
func _count_wall_neighbors(grid: Array, x: int, z: int) -> int:
	var count := 0

	for dx in range(-1, 2):
		for dz in range(-1, 2):
			if dx == 0 and dz == 0:
				continue

			var nx := x + dx
			var nz := z + dz

			# Treat out-of-bounds as walls to create natural edges
			if nx < 0 or nx >= ROOM_SIZE or nz < 0 or nz >= ROOM_SIZE:
				count += 1
			elif grid[nx][nz] == WALL_TILE_ID:
				count += 1

	return count

## Clear areas around doors to ensure player can enter/exit
func _clear_door_areas(grid: Array) -> void:
	var doors := [DOOR_NORTH, DOOR_SOUTH, DOOR_EAST, DOOR_WEST]

	for door in doors:
		for dx in range(-DOOR_BUFFER, DOOR_BUFFER + 1):
			for dz in range(-DOOR_BUFFER, DOOR_BUFFER + 1):
				var x: int = door.x + dx
				var z: int = door.y + dz

				if x >= 0 and x < ROOM_SIZE and z >= 0 and z < ROOM_SIZE:
					grid[x][z] = FLOOR_TILE_ID
