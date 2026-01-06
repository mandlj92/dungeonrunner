extends Node
class_name UpgradeManager

## Manages active upgrades on an entity (player, weapon, etc.)
## Handles applying, triggering, and removing upgrade effects

var active_upgrades: Array[UpgradeEffect] = []
var owner_entity: Node = null

signal upgrade_added(upgrade: UpgradeEffect)
signal upgrade_removed(upgrade: UpgradeEffect)

func setup(entity: Node) -> void:
	owner_entity = entity

func add_upgrade(upgrade_script: Script, config: Dictionary = {}) -> UpgradeEffect:
	var upgrade = upgrade_script.new() as UpgradeEffect

	# Apply configuration
	for key in config.keys():
		if key in upgrade:
			upgrade.set(key, config[key])

	# Add to scene tree and apply
	add_child(upgrade)
	upgrade.apply_to(owner_entity)
	active_upgrades.append(upgrade)

	upgrade_added.emit(upgrade)
	return upgrade

func add_upgrade_instance(upgrade: UpgradeEffect) -> void:
	add_child(upgrade)
	upgrade.apply_to(owner_entity)
	active_upgrades.append(upgrade)
	upgrade_added.emit(upgrade)

func remove_upgrade(upgrade: UpgradeEffect) -> void:
	if upgrade in active_upgrades:
		active_upgrades.erase(upgrade)
		upgrade_removed.emit(upgrade)
		upgrade.remove()

func trigger_upgrades(trigger_type: UpgradeEffect.TriggerType, context: Dictionary = {}) -> void:
	for upgrade in active_upgrades:
		if upgrade.trigger_type == trigger_type:
			upgrade.trigger(context)

func has_upgrade_type(upgrade_script: Script) -> bool:
	for upgrade in active_upgrades:
		if upgrade.get_script() == upgrade_script:
			return true
	return false

func get_upgrade_by_type(upgrade_script: Script) -> UpgradeEffect:
	for upgrade in active_upgrades:
		if upgrade.get_script() == upgrade_script:
			return upgrade
	return null

func clear_all_upgrades() -> void:
	for upgrade in active_upgrades.duplicate():
		remove_upgrade(upgrade)
