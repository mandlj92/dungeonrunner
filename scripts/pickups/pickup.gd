extends Area3D

enum Type { HEALTH, AMMO, RAGE }

@export var type: Type = Type.AMMO
@export var ammo_amount := 10
@export var health_amount := 0

func _on_body_entered(body: Node3D) -> void:
	if body.is_in_group("player"):
		if type == Type.RAGE:
			if body.has_method("activate_rage_mode"):
				body.activate_rage_mode(10.0)
		elif type == Type.AMMO:
			if ammo_amount > 0 and body.has_method("add_ammo"):
				body.add_ammo(ammo_amount)
		elif type == Type.HEALTH:
			if health_amount > 0 and body.has_method("heal"):
				body.heal(health_amount)
		queue_free()
