extends Control

@onready var health_label = $HealthLabel
@onready var ammo_label = $AmmoLabel
@onready var coins_label = $CoinsLabel
@onready var timer_label = $TimerLabel
@onready var damage_flash := _ensure_damage_flash()

func _ready() -> void:
	add_to_group("hud")

	# ensure a saved label exists (created lazily on first show)
	if not has_node("SavedLabel"):
		var lbl = Label.new()
		lbl.name = "SavedLabel"
		lbl.visible = false
		lbl.modulate = Color(1,1,1,0)
		lbl.horizontal_alignment = 1
		# anchor center-top
		lbl.anchor_left = 0.4
		lbl.anchor_right = 0.6
		lbl.anchor_top = 0.0
		lbl.anchor_bottom = 0.0
		lbl.offset_top = 0.1
		add_child(lbl)

func set_health(v:int, maxv:int) -> void:
	health_label.text = "HP: %d/%d" % [v, maxv]

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
		lbl.horizontal_alignment = 1
		add_child(lbl)

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
