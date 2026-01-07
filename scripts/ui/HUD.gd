extends Control

@onready var health_bar: ProgressBar = %HealthBar
@onready var health_label = $HealthLabel
@onready var ammo_label = $AmmoLabel
@onready var coins_label = $CoinsLabel
@onready var timer_label = $TimerLabel
@onready var damage_flash := _ensure_damage_flash()

var _cur_hp: int = 100
var _max_hp: int = 100

func _ready() -> void:
	add_to_group("hud")

	# Connect to Events signals
	Events.player_health_changed.connect(_on_player_health_changed)
	Events.player_damaged.connect(_on_player_damaged)
	Events.player_damage_flash_requested.connect(_on_damage_flash_requested)
	Events.player_rage_mode_changed.connect(_on_rage_mode_changed)

	# Connect to player for real-time updates
	var player = get_tree().get_first_node_in_group("player")
	if player:
		if player.has_signal("run_time_updated"):
			player.run_time_updated.connect(_on_run_time_updated)
		# Connect to component signals if they exist
		if player.has_node("WeaponController"):
			var weapon = player.get_node("WeaponController")
			weapon.ammo_changed.connect(_on_ammo_changed)

	# ensure a saved label exists (created lazily on first show)
	if not has_node("SavedLabel"):
		var lbl = Label.new()
		lbl.name = "SavedLabel"
		lbl.visible = false
		lbl.modulate = Color(1,1,1,0)
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		# anchor center-top
		lbl.anchor_left = 0.4
		lbl.anchor_right = 0.6
		lbl.anchor_top = 0.0
		lbl.anchor_bottom = 0.0
		lbl.offset_top = 0.1
		add_child(lbl)

func _process(delta: float) -> void:
	_update_crisis_pulse(delta)

func _update_crisis_pulse(_delta: float) -> void:
	if not damage_flash:
		return

	# Ensure _max_hp is not 0 to avoid division by zero
	if _max_hp <= 0:
		return

	# Calculate health ratio
	var ratio := float(_cur_hp) / float(_max_hp)

	# Crisis mode activates at 30% health or below
	if _cur_hp > 0 and ratio <= 0.3:
		# Force visibility ON
		damage_flash.visible = true
		# Pulse alpha between 0.05 and 0.2
		damage_flash.modulate.a = 0.05 + (0.15 * abs(sin(Time.get_ticks_msec() * 0.005)))
	else:
		# Only hide if we aren't currently running a damage flash tween
		if not damage_flash.modulate.a > 0.5:
			damage_flash.visible = false
			damage_flash.modulate.a = 0.0

func set_health(v: int, maxv: int) -> void:
	_cur_hp = v
	_max_hp = maxv
	health_label.text = "HP: %d/%d" % [v, maxv]

	# Update health bar with smooth tween (Rule 5.1: Visual feedback)
	if health_bar:
		health_bar.max_value = float(maxv)
		var target_value: float = float(v)
		var tween = create_tween()
		tween.tween_property(health_bar, "value", target_value, 0.2)

func set_ammo(v:int, maxv:int) -> void:
	ammo_label.text = "AMMO: %d/%d" % [v, maxv]

func set_coins(v:int) -> void:
	coins_label.text = "COINS: %d" % v

func set_time(seconds: float) -> void:
	timer_label.text = "TIME: %0.1f" % seconds

func flash_damage(strength: float = 0.6, duration: float = 0.25) -> void:
	if not damage_flash:
		return
	damage_flash.modulate = Color(1, 0, 0, clamp(strength, 0.0, 1.0))
	damage_flash.visible = true
	var t = create_tween()
	t.tween_property(damage_flash, "modulate:a", 0.0, duration)
	await t.finished
	damage_flash.visible = false

func show_saved(text: String = "Saved", duration: float = 1.2) -> void:
	var lbl: Label = get_node("SavedLabel") if has_node("SavedLabel") else null
	if lbl == null:
		lbl = Label.new()
		lbl.name = "SavedLabel"
		# anchor center-top
		lbl.anchor_left = 0.4
		lbl.anchor_right = 0.6
		lbl.anchor_top = 0.0
		lbl.anchor_bottom = 0.0
		lbl.offset_top = 10.0
		lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		add_child(lbl)

	lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lbl.text = text
	lbl.visible = true
	lbl.modulate = Color(1,1,1,0)

	var t = create_tween()
	t.tween_property(lbl, "modulate:a", 1.0, 0.12)
	await t.finished

	await get_tree().create_timer(duration).timeout

	var t2 = create_tween()
	t2.tween_property(lbl, "modulate:a", 0.0, 0.18)
	await t2.finished
	lbl.visible = false

func _on_player_health_changed(current: int, max: int) -> void:
	set_health(current, max)

func _on_player_damaged() -> void:
	flash_damage(0.8, 0.25)

func _on_damage_flash_requested(intensity: float, duration: float) -> void:
	flash_damage(intensity, duration)

func _on_rage_mode_changed(active: bool, opacity: float) -> void:
	if not damage_flash:
		return

	if active:
		damage_flash.visible = true
		damage_flash.modulate = Color(1, 0, 0, opacity)
	else:
		damage_flash.visible = false
		damage_flash.modulate = Color(1, 0, 0, 0)

func _on_run_time_updated(time: float) -> void:
	set_time(time)

func _on_ammo_changed(current: int, maximum: int) -> void:
	set_ammo(current, maximum)

func _ensure_damage_flash() -> ColorRect:
	if has_node("DamageFlash"):
		return get_node("DamageFlash") as ColorRect
	var rect = ColorRect.new()
	rect.name = "DamageFlash"
	rect.color = Color(1, 0, 0, 0)
	rect.visible = false
	rect.anchor_left = 0
	rect.anchor_top = 0
	rect.anchor_right = 1
	rect.anchor_bottom = 1
	rect.offset_left = 0
	rect.offset_top = 0
	rect.offset_right = 0
	rect.offset_bottom = 0
	add_child(rect)
	rect.move_to_front()
	return rect
