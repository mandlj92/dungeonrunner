extends UpgradeEffect
class_name VampireBullets

## Gun shots heal the player on hit

@export var heal_per_hit := 2

func _on_applied() -> void:
	upgrade_name = "Vampire Bullets"
	description = "Shooting enemies heals you"
	trigger_type = TriggerType.ON_SHOOT

	# Connect to Events if available
	if Events.has_signal("enemy_shot"):
		Events.enemy_shot.connect(_on_enemy_shot)

func _on_triggered(_context: Dictionary) -> void:
	# Called when weapon fires
	# The actual healing happens in _on_enemy_shot when projectile hits
	pass

func _on_enemy_shot(_enemy: Node) -> void:
	if not is_active or not owner_entity:
		return

	# Heal the player
	if owner_entity.has_node("HealthComponent"):
		var health_component = owner_entity.get_node("HealthComponent")
		if health_component.has_method("heal"):
			health_component.heal(heal_per_hit)

func _on_removed() -> void:
	if Events.has_signal("enemy_shot"):
		Events.enemy_shot.disconnect(_on_enemy_shot)
