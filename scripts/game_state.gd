extends Node

signal spawn_projectile(scene: PackedScene, spawn_transform: Transform3D, damage: int, shooter: Node)

enum UpgradeType {
	MAX_HEALTH,
	MOVE_SPEED,
	MELEE_DAMAGE,
	GUN_DAMAGE,
	AMMO_MAX,
	LIFESTEAL
}

var coins: int = 0
var run_seed: int = 0
var dungeon_level: int = 1  # Current dungeon depth (resets on death)
var max_dungeon_reached: int = 1  # Highest dungeon ever reached (persistent)

# Meta upgrades (heavy-ish progression MVP)
var upgrades := {
	UpgradeType.MAX_HEALTH: 0,     # +10 per level
	UpgradeType.MOVE_SPEED: 0,     # +3% per level
	UpgradeType.MELEE_DAMAGE: 0,   # +10% per level
	UpgradeType.GUN_DAMAGE: 0,     # +10% per level
	UpgradeType.AMMO_MAX: 0,       # +5 per level
	UpgradeType.LIFESTEAL: 0       # +1% per level (simple)
}

const SAVE_PATH := "user://save_game.cfg"
const SAVE_SECTION := "progress"
const META_SECTION := "meta"
const SAVE_SLOTS := 3

func _ready() -> void:
	load_game()

func new_run_seed() -> int:
	run_seed = randi()
	return run_seed

func add_coins(amount: int) -> void:
	coins += amount
	# Auto-save removed - player must save manually

func spend_coins(amount: int) -> bool:
	if coins >= amount:
		coins -= amount
		# Auto-save removed - player must save manually
		return true
	return false

# ---------- Core save/load (path-based) ----------
func advance_dungeon() -> void:
	dungeon_level += 1
	if dungeon_level > max_dungeon_reached:
		max_dungeon_reached = dungeon_level

func reset_run() -> void:
	dungeon_level = 1

func save_game(path: String = SAVE_PATH) -> bool:
	var cfg = ConfigFile.new()
	cfg.set_value(SAVE_SECTION, "coins", coins)

	# Convert enum keys to string keys for saving
	var upgrades_serialized := {}
	for upgrade_type in upgrades.keys():
		var key_name = UpgradeType.keys()[upgrade_type]
		upgrades_serialized[key_name] = upgrades[upgrade_type]
	cfg.set_value(SAVE_SECTION, "upgrades", upgrades_serialized)

	cfg.set_value(SAVE_SECTION, "dungeon_level", dungeon_level)
	cfg.set_value(SAVE_SECTION, "max_dungeon_reached", max_dungeon_reached)
	cfg.set_value(META_SECTION, "version", 1)
	var err = cfg.save(path)
	if err != OK:
		push_error("Failed to save game state: %s" % str(err))
		return false
	else:
		# notify HUD group to show save indicator if available
		if get_tree():
			get_tree().call_group("hud", "show_saved", "Saved")
		return true

func load_game(path: String = SAVE_PATH) -> bool:
	var cfg = ConfigFile.new()
	var err = cfg.load(path)
	if err == OK:
		coins = int(cfg.get_value(SAVE_SECTION, "coins", coins))
		dungeon_level = int(cfg.get_value(SAVE_SECTION, "dungeon_level", 1))
		max_dungeon_reached = int(cfg.get_value(SAVE_SECTION, "max_dungeon_reached", 1))

		# Load upgrades and convert string keys back to enum keys
		var loaded_upgrades = cfg.get_value(SAVE_SECTION, "upgrades", {})
		if typeof(loaded_upgrades) == TYPE_DICTIONARY:
			for upgrade_type in upgrades.keys():
				var key_name = UpgradeType.keys()[upgrade_type]
				if loaded_upgrades.has(key_name):
					upgrades[upgrade_type] = int(loaded_upgrades[key_name])
				# Also support legacy string keys for backwards compatibility
				elif loaded_upgrades.has(key_name.to_lower()):
					upgrades[upgrade_type] = int(loaded_upgrades[key_name.to_lower()])
		return true
	else:
		# no save yet or load failed
		return false

# ---------- Slot helpers ----------
func _slot_path(slot: int) -> String:
	return "user://save_slot_%d.cfg" % slot

func save_slot(slot: int) -> bool:
	if slot < 1 or slot > SAVE_SLOTS:
		push_error("Invalid save slot: %d" % slot)
		return false
	return save_game(_slot_path(slot))

func load_slot(slot: int) -> bool:
	if slot < 1 or slot > SAVE_SLOTS:
		push_error("Invalid load slot: %d" % slot)
		return false
	return load_game(_slot_path(slot))

func delete_slot(slot: int) -> bool:
	var path = _slot_path(slot)
	if FileAccess.file_exists(path):
		var err = DirAccess.remove_absolute(path)
		if err != OK:
			push_error("Failed to delete save slot %d: %s" % [slot, str(err)])
			return false
		return true
	return false

func slot_exists(slot: int) -> bool:
	return FileAccess.file_exists(_slot_path(slot))

# Return a small summary dictionary or empty dict if no slot
func get_slot_summary(slot: int) -> Dictionary:
	var path = _slot_path(slot)
	var cfg = ConfigFile.new()
	var err = cfg.load(path)
	if err != OK:
		return {}
	var s := {}
	s.coins = int(cfg.get_value(SAVE_SECTION, "coins", 0))
	s.version = int(cfg.get_value(META_SECTION, "version", 0))
	return s

# ---------- Global Hit Stop ----------
func hit_stop(time_scale: float, duration: float) -> void:
	Engine.time_scale = time_scale
	await get_tree().create_timer(duration, true, false, true).timeout
	Engine.time_scale = 1.0
