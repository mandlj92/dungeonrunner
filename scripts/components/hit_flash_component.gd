extends Node
class_name HitFlashComponent

## Component that makes a mesh flash white when the entity takes damage
## Listens to HealthComponent.health_changed and temporarily overrides material

@export var health_component: HealthComponent
@export var mesh: MeshInstance3D
@export var flash_material: StandardMaterial3D
@export var flash_duration: float = 0.1

func _ready() -> void:
	if health_component:
		health_component.health_changed.connect(_on_health_changed)

func _on_health_changed(current: int, _max: int) -> void:
	# Only flash when taking damage (health decreased)
	if not mesh or current <= 0:
		return

	# Swap material override efficiently
	mesh.material_override = flash_material
	await get_tree().create_timer(flash_duration).timeout

	if is_instance_valid(mesh):
		mesh.material_override = null
