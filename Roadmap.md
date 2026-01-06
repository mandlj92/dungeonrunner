# Dungeon Run Roadmap

This roadmap reflects the current state of the prototype and a practical path to a fun, replayable roguelite. It is organized by milestones with clear goals and concrete tasks. Adjust scope as needed.

## Guiding Goals
- Tight, readable combat with clear feedback.
- Short runs (5-10 minutes) with meaningful choices.
- Simple meta-progression that feels rewarding.
- Procedural variety without overcomplexity.

## Milestone 0: Current State (Baseline)
- Core loop: menu -> shop -> run -> summary.
- Procgen grid rooms with connectors.
- Player movement, ranged + melee combat.
- Basic enemy AI and pickups.
- HUD + pause menu.

## Milestone 1: Gameplay Feel and Clarity (Short-Term)
Focus: make combat and rewards feel satisfying before adding more content.

- Implement lifesteal upgrade or remove it from the shop UI.
- Add enemy hit feedback (flash color, small stagger, or sound).
- Add player damage feedback (brief invuln, knockback, or stronger hit VFX).
- Add run completion bonus (coins or multiplier).
- Add room clear reward (coins or pickup spawn chance).
- Add simple difficulty scaling by room index (enemy health/damage or count).

Definition of Done:
- Combat feels responsive and readable.
- Shop upgrades all work as described.
- Run rewards feel consistent and motivating.

## Milestone 2: Variety and Replayability
Focus: increase run-to-run variety without changing the core loop.

- Add 1-2 enemy variants (ranged or tank).
- Add 2-3 room templates to rotate.
- Add a mini-boss or elite enemy near the final room.
- Add pickup tiers (common/rare) with stronger effects.
- Add simple map goal variation (e.g., key + door, optional treasure room).

Definition of Done:
- Runs feel meaningfully different across multiple playthroughs.
- Difficulty curve ramps within a single run.

## Milestone 3: Progression and Meta Systems
Focus: deepen long-term engagement without bloating systems.

- Add save/load for coins and upgrades.
- Add a small set of run-only artifacts (pick one per run).
- Add per-run summary stats (time, kills, rooms cleared, upgrades bought).
- Add upgrade caps or branching paths (e.g., melee vs ranged focus).

Definition of Done:
- Clear sense of progression across runs.
- Players can describe their build choices.

## Milestone 4: Presentation and Polish
Focus: make it feel cohesive and playable for external feedback.

- Replace primitives with temp art or consistent stylized assets.
- Add simple VFX/SFX set for combat, pickups, and portal.
- Add music for menu and run.
- Add tutorial prompts or controls cheat-sheet.
- Improve UX flow (scene transitions, loading feedback).

Definition of Done:
- Project is shareable with clear onboarding.
- Feedback focuses on gameplay instead of clarity issues.

## Stretch Goals
- Boss fight with distinct phases.
- Room modifiers (fog, low gravity, hazard floors).
- Endless mode with scaling waves.
- Simple leaderboard (time or score).

## Risks and Open Questions
- How long should a run be? (target 5-10 minutes).
- How many rooms feel right before fatigue?
- Do you want a strong melee or strong ranged identity?
- Should the game be more arcade or tactical?

## Next Actions (Suggested)
1) Confirm whether lifesteal should be implemented or removed.
2) Add one enemy variant and basic scaling by room index.
3) Add run completion bonus and summary stats.
