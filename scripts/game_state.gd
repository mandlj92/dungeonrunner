extends Node

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
const SAVE_ENCRYPTION_KEY := "dungeon_run_v1_save_protection"  # Change this for your game
const CHECKSUM_SECTION := "integrity"

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

	# Calculate and store checksum to prevent simple tampering
	var checksum := _calculate_save_checksum(coins, upgrades_serialized, dungeon_level, max_dungeon_reached)
	cfg.set_value(CHECKSUM_SECTION, "hash", checksum)

	# Save with encryption for basic tamper protection
	var err = cfg.save_encrypted_pass(path, SAVE_ENCRYPTION_KEY)
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
	# Try to load encrypted save first
	var err = cfg.load_encrypted_pass(path, SAVE_ENCRYPTION_KEY)

	# Fallback to unencrypted for backwards compatibility with old saves
	if err != OK:
		err = cfg.load(path)

	if err == OK:
		var loaded_coins = int(cfg.get_value(SAVE_SECTION, "coins", coins))
		var loaded_dungeon_level = int(cfg.get_value(SAVE_SECTION, "dungeon_level", 1))
		var loaded_max_dungeon = int(cfg.get_value(SAVE_SECTION, "max_dungeon_reached", 1))

		# Load upgrades and convert string keys back to enum keys
		var loaded_upgrades = cfg.get_value(SAVE_SECTION, "upgrades", {})
		var loaded_upgrades_dict := {}

		if typeof(loaded_upgrades) == TYPE_DICTIONARY:
			for upgrade_type in upgrades.keys():
				var key_name = UpgradeType.keys()[upgrade_type]
				if loaded_upgrades.has(key_name):
					loaded_upgrades_dict[upgrade_type] = int(loaded_upgrades[key_name])
				# Also support legacy string keys for backwards compatibility
				elif loaded_upgrades.has(key_name.to_lower()):
					loaded_upgrades_dict[upgrade_type] = int(loaded_upgrades[key_name.to_lower()])
				else:
					loaded_upgrades_dict[upgrade_type] = 0

		# Verify checksum if it exists
		var stored_checksum = cfg.get_value(CHECKSUM_SECTION, "hash", "")
		if stored_checksum != "":
			var calculated_checksum = _calculate_save_checksum(loaded_coins, loaded_upgrades, loaded_dungeon_level, loaded_max_dungeon)
			if stored_checksum != calculated_checksum:
				push_warning("Save file checksum mismatch - possible tampering detected. Loading with caution.")
				# You could choose to reject the save here, or just warn

		# Apply loaded values
		coins = loaded_coins
		dungeon_level = loaded_dungeon_level
		max_dungeon_reached = loaded_max_dungeon
		for upgrade_type in loaded_upgrades_dict.keys():
			upgrades[upgrade_type] = loaded_upgrades_dict[upgrade_type]

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

# ---------- Save Integrity ----------
func _calculate_save_checksum(coin_count: int, upgrade_dict: Dictionary, dungeon_lvl: int, max_dungeon: int) -> String:
	# Create a deterministic string representation of save data
	var data_string := "%d|%d|%d" % [coin_count, dungeon_lvl, max_dungeon]

	# Add upgrades in sorted order for consistency
	var upgrade_keys := upgrade_dict.keys()
	upgrade_keys.sort()
	for key in upgrade_keys:
		data_string += "|%s:%s" % [key, upgrade_dict[key]]

	# Hash the data using SHA-256
	var ctx = HashingContext.new()
	ctx.start(HashingContext.HASH_SHA256)
	ctx.update(data_string.to_utf8_buffer())
	var hash := ctx.finish()

	# Convert to hex string
	return hash.hex_encode()
