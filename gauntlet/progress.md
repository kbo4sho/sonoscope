# Sonoscope → rack-metal reference

**Bar:** `/workspace/gauntlet/bar-reference.jpg` — brushed-metal rack spectrum analyser (user-supplied)
**Started:** 2026-08-26
**Status:** running
**Budget:** ~40 critic rounds · spent 0 · critic reserve ~10

## Routing
| Role | Model | Effort |
|---|---|---|
| Lead | inherit (Composer) | high |
| Builder — visual | claude-opus-5-thinking-high | high |
| Critic — taste | gpt-5.6-sol-xhigh | high |
| computerUse screenshots | inherit | — |
| Smoothing | claude-sonnet-5-thinking-high | medium |

## Pieces
| Piece | Rounds | Last verdict | Open gap | Spend |
|---|---|---|---|---|
| chassis-shell | 2 | lost | compact hardware-scale + wear | 2 |
| spectrum-display | 0 | — | paired | 0 |
| header-transport | 2 | lost | oversized glossy plastic controls | 2 |
| readout-grid | 0 | — | paired | 0 |
| bottom-controls | 2 | lost | compact hardware scale | 2 |
| whole-frame | 2 | lost | see gap | 2 |

## Round log
### whole-frame round 1
- Verdict: lost (bar = A, ours = B)
- Gap: Rebuild panel at full-frame scale with deep bevels, textured metal, tactile controls, and stronger hardware shadows.
- Evidence: `gauntlet/rounds/r1-pair-*.jpg`

### whole-frame round 2
- Verdict: lost (ours = A, bar = B)
- Gap: Replace oversized glossy plastic controls and sterile uniform surfaces with compact hardware-scale switches, deeper panel recesses, and subtle material wear.
- Evidence: `gauntlet/rounds/r2-pair-*.jpg`
- Route: critic gpt-5.6-sol-xhigh
