extends Resource
class_name RoomTemplate

## Resource defining a room template's metadata and generation parameters
## Used by ProcGen to select and customize room layouts

enum RoomType {
	ARENA,      ## Large open space, many enemies
	NARROW,     ## Corridor-like, ambush enemies
	PILLARS,    ## Cover mechanics, strategic combat
	MULTILEVEL  ## Platforms/height variation (future)
}

## Descriptive name for this template
@export var template_name: String = "Basic Room"

## Room type classification
@export var room_type: RoomType = RoomType.ARENA

## Difficulty rating (1=easy, 3=hard)
@export_range(1, 3) var difficulty: int = 1

## Minimum room depth before this template can appear
@export var min_depth: int = 0

## RoomBuilder generation parameters
@export_group("Generation")

## Wall density for cellular automata (0.0-1.0)
@export_range(0.0, 1.0) var wall_density: float = 0.45

## Number of cellular automata iterations
@export_range(1, 10) var automata_iterations: int = 4

## Door buffer size (tiles to clear around doors)
@export_range(1, 5) var door_buffer: int = 3

## Enable pillar generation
@export var has_pillars: bool = false

## Pillar count (if has_pillars is true)
@export_range(3, 12) var pillar_count: int = 6

@export_group("Spawning")

## Recommended enemy spawn count range
@export var min_enemies: int = 3
@export var max_enemies: int = 6

## Override spawn point distribution (empty = use RoomBuilder floor tiles)
@export var custom_spawn_points: Array[Vector3] = []
