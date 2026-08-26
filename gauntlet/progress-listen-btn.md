# Listen button active state — gauntlet

**Goal:** Active Listen must read as real rack hardware: same geometry as idle siblings; status shown only by lighting the existing LED (and optional subtle press), never by growing the housing.

**Bar:** Physical rack transport switches (API / Neve-style): fixed bezel height; amber jewel LED above the switch indicates latch. Geometry bar = sibling File button in the same faceplate. Lit-LED bar = Sonoscope’s own MICROPHONE square lamp (same amber language).

**Anti-bar (current bug):** `/home/ubuntu/.cursor/projects/workspace/assets/01a03e5a-badf-732a-a583-d97a7fb28347.jpg` — housing grows tall when active.

**Idle reference:** `/home/ubuntu/.cursor/projects/workspace/assets/01a03e5a-5b1e-7e19-9091-cfe7207c84b5.jpg`

## Routing

| Role | Tier | Model |
|---|---|---|
| Lead | T3 | session |
| Critic (taste) | T3 | gpt-5.6-sol-xhigh |
| Screenshots | T0 | playwright / computerUse |

**Budget:** lean — one piece. Stop when critic clears bar.

## Round log

| Round | Result | Gap |
|---|---|---|
| 0 | diagnosis | `.is-active` set housing `height:28px` + hid `.led-dot` + chamber lamp |
| 1 | **won** (pair right=ours) | jewel not bright enough |
| 2 | polish | brighter LED; wash was covering jewel / size change shifted flex-end row |
| 3–4 | **cleared** | DOM: mic=file housing 22px same top; LED 3.5px amber when active. Critic: pair left=ours, R4 cleared, gap none |

## Stop

**Condition 2:** per-round gains stopped; critic cleared the bar (fixed geometry + lit LED vs tall rocker).

## Assumptions

- Best realism = light existing jewel LED, not a tall rocker latch.
- Subtle pressed-in cap when latched is OK.
- Demo mode `/?demo=1` is the inspection path (mic permission not required).

## Artifacts

- `/opt/cursor/artifacts/listen_active_led_fixed.png`
- `/opt/cursor/artifacts/listen_idle_aligned.png`
- `/opt/cursor/artifacts/listen_faceplate_active_fixed.png`
- Pairs: `gauntlet/listen-btn/`
