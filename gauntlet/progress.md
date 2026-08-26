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
| chassis-shell | 1 | lost | full-frame deep bevels + textured metal | 1 |
| spectrum-display | 0 | — | paired with chassis | 0 |
| header-transport | 0 | — | paired with chassis | 0 |
| readout-grid | 0 | — | paired with chassis | 0 |
| bottom-controls | 0 | — | paired with chassis | 0 |
| whole-frame | 1 | lost | see chassis | 1 |

## Round log
### whole-frame round 1
- Verdict: lost (bar = A, ours = B)
- Gap: Rebuild panel at full-frame scale with deep bevels, textured metal, tactile controls, and stronger hardware shadows.
- Evidence: `gauntlet/rounds/r1-pair-a.jpg` (bar), `gauntlet/rounds/r1-pair-b.jpg` (ours)
- Route: critic gpt-5.6-sol-xhigh
