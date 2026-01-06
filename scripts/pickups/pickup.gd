extends Area3D

@export var ammo_amount := 10
@export var health_amount := 0

func _on_body_entered(body: Node3D) -> void:
	if body.is_in_group("player"):
		if ammo_amount > 0 and body.has_method("add_ammo"):
			body.add_ammo(ammo_amount)
		if health_amount > 0 and body.has_method("heal"):
			body.heal(health_amount)
		queue_free()
