extends Node
class_name EnemyStateHelper

## Helper class for enemy state processing
## Extracts heavy state logic from enemy.gd to keep it under 200 lines
## Per RULES.md Section 1: scripts must be under 200 lines

func process_chasing(
	enemy: CharacterBody3D,
	player: Node3D,
	agent: NavigationAgent3D,
	raycast: RayCast3D,
	delta: float,
	speed: float,
	attack_range: float,
	aggro_range: float,
	hit_stun_timer: float
) -> Dictionary:
	var dist := enemy.global_transform.origin.distance_to(player.global_transform.origin)

	# Check aggro range
	if dist > aggro_range:
		return {
			"velocity": Vector3(0, enemy.velocity.y, 0),
			"new_state": null
		}

	# Raycast LOS check
	raycast.target_position = player.global_transform.origin - enemy.global_transform.origin
	raycast.force_raycast_update()

	var has_los := false
	if raycast.is_colliding():
		var hit := raycast.get_collider()
		if hit and hit.is_in_group("player"):
			has_los = true
	else:
		has_los = true

	# Choose movement strategy
	var target_pos: Vector3
	if has_los:
		# Direct movement
		target_pos = player.global_transform.origin
	else:
		# Use navigation
		agent.target_position = player.global_transform.origin
		target_pos = agent.get_next_path_position()

		# Fallback if navigation fails
		if target_pos == Vector3.ZERO or target_pos.distance_to(enemy.global_transform.origin) <= 0.05:
			target_pos = player.global_transform.origin

	# Calculate movement
	var dir := (target_pos - enemy.global_transform.origin)
	dir.y = 0
	if dir.length() > 0.05:
		dir = dir.normalized()

	var speed_scale := 0.15 if hit_stun_timer > 0.0 else 1.0

	# Elite enemies move 20% faster
	var elite_multiplier := 1.2 if enemy.has_meta("is_elite") else 1.0

	var new_velocity := Vector3(
		dir.x * speed * speed_scale * elite_multiplier,
		enemy.velocity.y,
		dir.z * speed * speed_scale * elite_multiplier
	)

	# Check for state transition to SURROUNDING
	var new_state = null
	if dist <= attack_range:
		new_state = 2  # State.SURROUNDING

	return {
		"velocity": new_velocity,
		"new_state": new_state
	}

func process_surrounding(
	enemy: CharacterBody3D,
	player: Node3D,
	agent: NavigationAgent3D,
	delta: float,
	speed: float,
	attack_range: float,
	token_request_timer: float,
	attack_manager: Node
) -> Dictionary:
	var dist := enemy.global_transform.origin.distance_to(player.global_transform.origin)

	# Check if player moved away
	if dist > attack_range * 1.5:
		return {
			"new_state": 1,  # State.CHASING
			"velocity": enemy.velocity,
			"token_request_timer": token_request_timer
		}

	# Update token request timer
	var new_timer := token_request_timer - delta
	if new_timer <= 0.0:
		new_timer = 0.1  # TOKEN_REQUEST_INTERVAL
		if attack_manager.request_attack(enemy):
			return {
				"new_state": 3,  # State.ATTACKING
				"velocity": enemy.velocity,
				"attack_timer_reset": true,
				"token_request_timer": new_timer
			}

	# Continue pathfinding toward player
	agent.target_position = player.global_transform.origin
	var nav_target := agent.get_next_path_position()
	if nav_target == Vector3.ZERO or nav_target.distance_to(enemy.global_transform.origin) <= 0.05:
		nav_target = player.global_transform.origin

	var nav_dir := (nav_target - enemy.global_transform.origin)
	nav_dir.y = 0
	if nav_dir.length() > 0.05:
		nav_dir = nav_dir.normalized()

	var new_velocity := Vector3(
		nav_dir.x * speed * 0.5,  # Slower while surrounding
		enemy.velocity.y,
		nav_dir.z * speed * 0.5
	)

	return {
		"velocity": new_velocity,
		"token_request_timer": new_timer,
		"new_state": null
	}

func process_attacking(
	enemy: CharacterBody3D,
	player: Node3D,
	delta: float,
	attack_timer: float,
	attack_cooldown: float,
	attack_range: float,
	damage: int,
	attack_manager: Node
) -> Dictionary:
	var result := {
		"new_state": null,
		"attack_executed": false,
		"token_returned": false
	}

	# Execute attack when timer ready
	if attack_timer <= 0.0:
		if player and player.has_method("take_damage"):
			var hit_dir := (player.global_transform.origin - enemy.global_transform.origin).normalized()
			player.take_damage(damage, hit_dir)
			print("[Enemy] ", enemy.name, " attacked player for ", damage, " damage!")
			result.attack_executed = true

		# Attack timer will be set to attack_cooldown by caller
		return result

	# Check if cooldown is complete
	if attack_timer > 0.0 and attack_timer <= delta:
		# Cooldown just finished
		print("[Enemy] ", enemy.name, " attack cooldown complete, returning token")
		attack_manager.return_attack(enemy)
		result.token_returned = true

		# Check distance for next state
		var dist := enemy.global_transform.origin.distance_to(player.global_transform.origin)
		if dist <= attack_range:
			result.new_state = 2  # State.SURROUNDING
		else:
			result.new_state = 1  # State.CHASING

	return result
