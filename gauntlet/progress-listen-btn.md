# Listen button active state — gauntlet

**Goal:** Active Listen must read as real rack hardware: same geometry as idle siblings; status shown only by lighting the existing LED (and optional subtle press), never by growing the housing.

**Bar:** Physical rack transport switches (API / Neve-style): fixed bezel height; amber jewel LED above the switch indicates latch. Geometry bar = sibling File button in the same faceplate. Lit-LED bar = Sonoscope’s own MICROPHONE square lamp (same amber language).

**Anti-bar (current bug):** `/home/ubuntu/.cursor/projects/workspace/assets/01a03e5a-badf-732a-a583-d97a7fb28347.jpg` — housing grows tall when active.

**Idle reference:** `/home/ubuntu/.cursor/projects/workspace/assets/01a03e5a-5b1e-7e19-9091-cfe7207c84b5.jpg`

## Routing

| Role | Tier | Model |
|---|---|---|
| Lead | T3 | session |
| Builder (visual) | T3 | gpt-5.6-sol-xhigh / lead |
| Critic (taste) | T3 | gpt-5.6-sol-xhigh |
| Scribe / mechanical | T1 | composer-2.5-fast |
| Screenshots | T0 | computerUse / playwright |

**Budget:** lean — one piece, up to ~4 critic rounds, stop when critic picks fixed geometry + lit LED over tall rocker / when gains stop.

## Status

Round 0 — diagnosis complete. Cause: `.rack-btn.is-active .rb-housing { height: 28px; margin-top: -7px }` plus hidden `.led-dot` and chamber `::before` lamp.

Next: implement fixed-height + lit LED; capture A/B; blind critic.
