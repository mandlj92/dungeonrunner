extends Node

@export var max_tokens := 2

var _active_attackers: Dictionary = {}
var _token_count := 0

func request_attack(enemy: Node) -> bool:
	if _active_attackers.has(enemy):
		return true

	if _token_count < max_tokens:
		_active_attackers[enemy] = true
		_token_count += 1
		return true

	return false

func return_attack(enemy: Node) -> void:
	if _active_attackers.has(enemy):
		_active_attackers.erase(enemy)
		_token_count -= 1
		_token_count = max(_token_count, 0)

func _ready() -> void:
	get_tree().node_removed.connect(_on_node_removed)

func _on_node_removed(node: Node) -> void:
	if _active_attackers.has(node):
		return_attack(node)
