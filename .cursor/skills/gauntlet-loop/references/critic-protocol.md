# Critic protocol

The critic is the mechanism that keeps the run from ending early. A soft critic collapses the entire method.

## Rule zero

The builder never grades its own work. Not even "just to save a round". It knows every decision it made, which makes it excellent at justifying the result. Independent judgment requires clean context.

The same applies to cost. The critic is the one seat in the run that never gets routed down to a cheap model, because a critic that approves early turns the whole loop back into a first draft. Where the verdict is a measurement rather than a judgment, run the command instead: a number does not need a reasoning model to read it. See `model-routing.md`.

## What the critic gets

| Gets | Does not get |
|---|---|
| The goal | The builder's transcript |
| The bar and how to inspect it | The builder's explanation of decisions |
| Project constraints and rules | A summary of what was done |
| The real artifact | Which side is ours |
| The previous critique, if any | Effort or time spent |

Labels like "option A (ours)" break blindness. Use neutral filenames and randomize the order every round.

## Per-round procedure

1. **Inspect the real thing.** Render it, run it, open it in a browser, execute the tests, read the finished text. A report written by the builder is not evidence.
2. **Compare blind** against the bar, at the same framing, resolution, and scenario.
3. **Pick a winner.** Binary verdict. A tie counts as a loss for us.
4. **If we lost, name the single largest remaining gap.** Highest impact, stated in actionable and verifiable terms.
5. **Send it back** with the gap and nothing else. Do not spell out the fix. The builder decides how to close it.
6. **If we won**, raise the bar or mark the piece done and report to the lead.

## Critic output format

```
VERDICT: lost | won
EVIDENCE: what was inspected and how (file path, command run, URL opened)
LARGEST GAP: one actionable sentence
WHY IT MATTERS: direct link to the bar
```

No preamble, no praise, no list of ten improvements. Ten gaps at once dilute the next round into nothing.

## Calibration

The critic must be harsh by explicit instruction, with its ruler against the bar and never against the effort invested.

Signs of a soft critic, which mean rewriting the instruction or swapping the agent:

- Praises before judging.
- Accepts "on the right track" as approval.
- Flags cosmetic gaps while a structural one is open.
- Repeats a gap without verifying whether it was actually closed.
- Approves without citing inspection evidence.

Signs of an over-harsh critic, which stall the run:

- Rejects on personal preference unrelated to the bar.
- Changes criteria between rounds.
- Demands perfection on a piece that already beats the reference.

## Anti-loop

If the same gap survives three consecutive rounds, stop the piece and escalate to the lead. It usually means one of three things:

- The gap is structural and needs a change of approach, not refinement.
- The bar is wrong for this piece.
- The builder and the critic are measuring different things.

All three are lead-agent decisions, not builder/critic decisions.

## Without independent agents

When the harness cannot spawn independent agents, approximate the effect:

- Hard-separate the passes: build, then inspect. Never in the same reasoning step.
- In the critique pass, deliberately discard why the decisions were made and judge only the artifact.
- Require the artifact back in inspectable form (file, render, executed output) before judging.
- Tell the user the independence is simulated and the result will skew lenient.
