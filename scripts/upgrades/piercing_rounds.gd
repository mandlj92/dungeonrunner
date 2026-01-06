extends UpgradeEffect
class_name PiercingRounds

## Bullets pierce through 1 enemy (or more at higher levels)

@export var pierce_count := 1

func _on_applied() -> void:
	upgrade_name = "Piercing Rounds"
	description = "Bullets pierce through %d enem%s" % [pierce_count, "y" if pierce_count == 1 else "ies"]
	trigger_type = TriggerType.ON_SHOOT

func _on_triggered(context: Dictionary) -> void:
	# Context should contain: projectile reference
	if context.has("projectile"):
		var projectile = context["projectile"]
		if projectile.has_method("set_pierce_count"):
			projectile.set_pierce_count(pierce_count)
