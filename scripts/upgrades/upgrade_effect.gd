extends Node
class_name UpgradeEffect

## Base class for upgrade effects that modify gameplay behavior
## Upgrades attach themselves to entities (player, weapons, etc.) and respond to events

enum TriggerType {
	ON_SHOOT,          # When gun fires
	ON_MELEE,          # When melee attack happens
	ON_KILL,           # When enemy is killed
	ON_DAMAGE_TAKEN,   # When taking damage
	ON_RELOAD,         # When reloading (if we add that)
	ON_SPRINT,         # While sprinting
	ON_JUMP,           # When jumping
	PASSIVE,           # Always active (modify stats)
}

@export var upgrade_name: String = "Base Upgrade"
@export var description: String = "Does nothing"
@export var trigger_type: TriggerType = TriggerType.PASSIVE
@export var is_active := true

var owner_entity: Node = null

func _ready() -> void:
	pass

## Called when the upgrade is first applied to an entity
func apply_to(entity: Node) -> void:
	owner_entity = entity
	_on_applied()

## Override this in derived classes
func _on_applied() -> void:
	pass

## Called when the trigger event occurs
func trigger(context: Dictionary = {}) -> void:
	if not is_active:
		return
	_on_triggered(context)

## Override this in derived classes
func _on_triggered(_context: Dictionary) -> void:
	pass

## Called when the upgrade is removed
func remove() -> void:
	_on_removed()
	queue_free()

## Override this in derived classes
func _on_removed() -> void:
	pass
