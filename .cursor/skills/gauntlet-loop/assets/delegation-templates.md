# Delegation templates

Briefs the lead agent writes when spawning workers. These are internal wiring, never shown to the user and never handed over for the user to run.

Fill the brackets from the run context. Keep them short. A long brief starts substituting the lead's judgment for the worker's.

## Spawn parameters

Every spawn carries a route as well as a brief. Decide it before writing the brief, using the table in `references/model-routing.md`.

```
ROLE:   lead | builder-novel | builder-standard | builder-mechanical |
        critic-judgment | critic-measurable | smoother | scribe | retrieval
TIER:   T0 (no model, run a command) | T1 | T2 | T3
EFFORT: minimal | low | medium | high | max
```

Three questions decide it. Is success checkable by a command? T0, run it. Is the target state already fully specified? T1 at minimal effort. Does closing the gap require deciding what good looks like? T3.

Judgment is never below the top tier. Bookkeeping is never above the bottom one.

## Builder brief

```
PIECE: [the single piece this agent owns]
GOAL: [what this piece must achieve, in outcome terms, not implementation terms]
CONSTRAINTS: [real project constraints only: stack, brand, API contract, budget]
WORKSPACE: [paths it may read and write]
GAP TO CLOSE: [on round 1: none, produce the first version.
               on later rounds: the single gap the critic returned]

Build it. Do not judge your own output and do not report that it looks good.
When done, leave the artifact in an inspectable form at [path] and say only
what you changed.
```

Never include in a builder brief: the previous critic's full reasoning, praise for earlier rounds, or a suggested implementation for the gap. The builder decides how to close it.

Route this one by the nature of the piece, not by the ambition of the run. A first version of something visual or novel is T3. A refactor or an ordinary feature is T2.

## Mechanical worker brief

For work where the target state is already decided and nothing is being judged. T1 at minimal effort, and batched: fifteen of these are one call, not fifteen.

```
TASKS:
- [exact change, exact location]
- [exact change, exact location]
WORKSPACE: [paths it may read and write]

Apply exactly these changes. Do not improve anything else, do not refactor
surrounding code, and do not comment on quality. Report only the files touched.
```

If a task in this list cannot be stated exactly, it does not belong here. It is a builder task.

## Measurement check

Not an agent. A command, run by the lead or by a T1 worker that only reports the result.

```
COMMAND: [exact command]
TARGET: [threshold, with units]
Report: measured value, pass or fail, nothing else.
```

Tests, latency, contrast ratios, bundle size, row counts, exit codes. Never spend a reasoning model on a number that a command produces.

## Critic brief

```
GOAL: [what this piece must achieve]
BAR: [the reference artifact or measurement, and its exact location]
HOW TO INSPECT: [render this, run this command, open this URL, execute this suite]
CANDIDATES: [path A] and [path B]

One of these is ours and one is the bar. You are not told which.
Inspect both directly. Never judge from a description or a summary.

Return exactly:
VERDICT: A | B
EVIDENCE: what you inspected and how
LARGEST GAP: one actionable sentence describing the biggest difference
             that keeps the weaker one behind
WHY IT MATTERS: direct link to the goal

No preamble, no praise, no list of minor improvements.
```

Randomize which path is A each round and use neutral filenames. `ours.png` breaks blindness instantly.

When blind comparison is impossible (there is no paired artifact, only a numeric target), replace the candidates block with:

```
TARGET: [the measurement and its threshold]
MEASURE IT: [exact command or procedure]
Report the measured value, whether it clears the target, and the single
largest reason it does not.
```

## Smoothing brief

```
ARTIFACT: [the whole thing, not a piece]
CONTEXT: [n] agents edited separate parts in parallel.

Inspect the complete result. Find where the parts fight each other:
inconsistent spacing, tone, naming, error handling, visual language,
duplicated logic, contradictory claims.

Fix the conflicts. Do not redesign anything and do not improve individual
parts. Your only job is making it feel like one thing.
```

## Progress file

The lead maintains this, not the workers. Append as rounds land.

```markdown
# [Goal]

**Bar:** [what it is and where it lives]
**Started:** [timestamp]
**Status:** running | stopped by [condition]
**Budget:** [total] · spent [amount] · critic reserve [amount]

## Routing
| Role | Model | Effort |
|---|---|---|

## Pieces
| Piece | Rounds | Last verdict | Open gap | Spend |
|---|---|---|---|---|

## Round log
### [piece] round [n]
- Verdict: [lost/won]
- Gap: [one sentence]
- Evidence: [path to screenshot, test output, measurement]
- Route: [model, effort] · [spend]
```

The routing and spend columns are not decoration. A piece consuming a large share of the budget without changing verdict is the earliest signal that the gap is structural, and it shows up here before it shows up in the work.

For visual work, embed the paired screenshots directly. A user checking from a phone should understand the state of the run in five seconds without reading anything.
