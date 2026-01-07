extends Node3D

## Room template defining this room's characteristics
var template: RoomTemplate = null

## Valid floor positions for spawning (set by ProcGen)
var valid_floor_positions: Array[Vector3] = []

var _activation_zone: Area3D = null
var _is_active := false
var _children_with_wakeup: Array[Node] = []
var _children_with_dormant: Array[Node] = []

func _ready() -> void:
	_activation_zone = _find_activation_zone()

	if _activation_zone:
		_activation_zone.body_entered.connect(_on_activation_entered)
		_activation_zone.body_exited.connect(_on_activation_exited)
	else:
		push_warning("Room '%s' has no ActivationZone child!" % name)

	_cache_child_methods()

func _find_activation_zone() -> Area3D:
	for child in get_children():
		if child.name == "ActivationZone" and child is Area3D:
			return child
	return null

func _cache_child_methods() -> void:
	# Need to recursively check all descendants, not just direct children
	# because enemies are added dynamically after _ready()
	pass

func _refresh_enemy_cache() -> void:
	_children_with_wakeup.clear()
	_children_with_dormant.clear()

	for child in get_children():
		if child.has_method("wake_up"):
			_children_with_wakeup.append(child)
		if child.has_method("go_dormant"):
			_children_with_dormant.append(child)

func _on_activation_entered(body: Node3D) -> void:
	if body.is_in_group("player"):
		print("[Room] Player entered room: ", name)
		_activate_room()

func _on_activation_exited(body: Node3D) -> void:
	if body.is_in_group("player"):
		print("[Room] Player exited room: ", name)
		_deactivate_room()

func _activate_room() -> void:
	if _is_active:
		return

	_is_active = true

	# Refresh cache in case enemies were added after _ready()
	_refresh_enemy_cache()

	print("[Room] Activating ", name, " with ", _children_with_wakeup.size(), " enemies")

	for child in _children_with_wakeup:
		if is_instance_valid(child):
			print("[Room] Waking up enemy: ", child.name)
			child.wake_up()

func _deactivate_room() -> void:
	if not _is_active:
		return

	_is_active = false

	# Refresh cache before deactivating
	_refresh_enemy_cache()

	for child in _children_with_dormant:
		if is_instance_valid(child):
			child.go_dormant()
