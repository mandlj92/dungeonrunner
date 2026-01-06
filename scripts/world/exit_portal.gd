extends Area3D

@onready var mesh_instance := $MeshInstance3D
var rotation_speed := 2.0

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	mesh_instance.rotate_y(rotation_speed * delta)

func _on_body_entered(body: Node3D) -> void:
	if body.is_in_group("player") and body.has_signal("exited"):
		body.emit_signal("exited")
