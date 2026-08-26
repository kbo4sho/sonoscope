# Model routing

The loop multiplies calls. Eight pieces, four rounds, one builder and one critic each, is sixty-four agent calls before the smoothing pass. Run every one of them on a frontier model at maximum reasoning and the run costs an order of magnitude more than the work required, mostly on calls where nothing was being decided.

The rule is not "use cheap models". It is **spend where judgment happens, and nowhere else**.

## Rule zero

**Judgment is never routed to the cheapest tier.**

A weak critic approves early, and a run whose critic approves early produced a first draft with extra steps. Saving there does not save money, it cancels the method. Cut cost on builders, on mechanical edits, on retrieval, on bookkeeping, and on anything a command can verify. Never on the verdict.

## The two dials

1. **Capability tier** — which model.
2. **Reasoning effort** — how hard it thinks. Usually the larger multiplier of the two, and the one that gets left at maximum by accident.

They are independent. A mid model at high effort and a frontier model at minimal effort cost similar amounts and are good at different things. When a piece keeps losing on a *reasoning-shaped* gap (missed a case, wrong tradeoff, broken logic), raise effort first. When it loses on a *taste-shaped* gap (looks generic, reads flat, feels unresolved), raise the tier. Effort does not buy taste.

## Tiers

| Tier | What it is | Use for |
|---|---|---|
| **T0** | No model at all. A command, script, or test. | Anything with a deterministic answer. The cheapest agent is no agent. |
| **T1** | Small fast model, minimal effort | Mechanical edits, retrieval, formatting, bookkeeping, reporting a measurement |
| **T2** | Mid model, low to medium effort | Standard building, refactors, tests, wiring, copy, smoothing |
| **T3** | Frontier model, high to max effort | The lead, the bar, novel or visual building, and every judgment call |

## Classifying the task, in three questions

Ask these before every spawn. They are the whole router.

1. **Is success checkable by a command?** Tests, latency, contrast ratio, bundle size, row counts, exit code. → **T0.** Run it. A number does not need a model to read it.
2. **Is the target state already fully specified?** "Change the button to `#111`", "rename this symbol", "apply the one-line fix the critic named", "move these files". → **T1.** Nothing is being decided, only typed.
3. **Does closing the gap require deciding what good looks like?** → **T3.** This is the Ferrari's actual errand.

Everything that is none of the three is **T2**.

## Routing table by role

| Role | Tier | Effort | Notes |
|---|---|---|---|
| Lead / orchestrator | T3 | high | One instance, low call volume, highest leverage in the run |
| Bar acquisition | T1 | minimal | Fetching URLs, saving screenshots, downloading references, taking baseline measurements |
| Builder — novel or visual | T3 | high | Design, architecture, the first version of a hard piece |
| Builder — standard | T2 | medium | Wiring, refactors, tests, documentation, ordinary features |
| Builder — mechanical | T1 | minimal | Renames, moves, formatting, token swaps, single-property changes, applying a fix that was already spelled out |
| Critic — taste and judgment | T3 | high | Rule zero. A different provider from the builder is a bonus: different blind spots |
| Critic — measurable | T0, then T1 to report | minimal | Run the suite, read the number, state pass or fail against the threshold |
| Smoothing pass | T2 | medium | T3 only when the artifact is large or visual |
| Progress file / scribe | T1 | minimal | Never spend lead context on bookkeeping |
| Research / retrieval | T1–T2 | low | Reading docs, gathering references, summarizing sources |

Decide this table once, at the start of the run, against what the harness actually offers. Record it in the progress file. Routing invented per call drifts upward.

## Never hardcode a model name

Model names and prices move faster than this file. Discover what is available at run start:

- The harness's own list (`/model` in most CLIs, the model picker in editors, `config.toml` in Codex).
- The provider's model endpoint when working through an API or a router.
- What the user already configured. Their default is a signal about their budget.

Then map what you found into the four tiers using three signals: the provider's own positioning of the model, its price per million tokens, and whether it exposes a reasoning dial. If you cannot enumerate anything, stay on the harness default and route using effort alone. That still captures most of the savings.

**Families, not versions.** Illustrative only, and worth verifying before you rely on it:

| Provider | T3 | T2 | T1 |
|---|---|---|---|
| Anthropic | Opus, Fable class | Sonnet class | Haiku class |
| OpenAI / Codex | flagship GPT class, high or xhigh effort | flagship at low effort, or mini | mini or nano at minimal effort |
| Google | Gemini Pro class | Flash class | Flash-Lite class |
| xAI | Grok frontier class | Grok fast class | Grok fast at minimal reasoning |
| DeepSeek | reasoning series at high effort | reasoning series at low effort | chat series |
| Open-weight (Qwen, GLM, Kimi, Llama) | largest reasoning variants | mid instruct variants | small instruct variants |
| OpenRouter | enumerate `/models`, sort by price, route by capability tag | | cheap fan-out for T1 volume |
| Local (Ollama, LM Studio) | never | rarely | fine for T0 and T1 |

Open-weight and local models are legitimate T1 workers and can carry a large share of the call volume. They are not critics.

## Escalation ladder

Start builders one tier below your instinct and let evidence move them.

1. Round one at the table's default.
2. Lost twice on the same gap → **raise effort one step**.
3. Lost again → **raise the tier**.
4. Same gap surviving three rounds → **structural escalation**, which is a lead decision about approach or bar, not more tokens. Spending more at this point is the most common way to burn a budget on nothing.

Downgrade too. Once a piece is winning and the remaining work is polish, drop it back to T1 or T2 for the rest of the run.

**The expensive mistake is not the expensive model.** A T1 builder that loses four rounds on a piece that needed taste costs more than a T3 builder that wins in one, and it costs four critic calls on top. Cheap work that gets redone is the most expensive line in the run. When a piece is visibly about novelty, judgment, or visual quality, start high.

## Structural savings

These matter more than tier selection, and they are already protocol rules. They are also the largest token line items in the run.

- **One gap per round.** Ten gaps at once dilute the round and multiply the tokens spent reacting to them.
- **Never pass a transcript.** Required for blindness, and the single biggest saving available.
- **Pass paths, not contents.** Let the worker read what it needs.
- **Batch the trivia.** Fifteen mechanical edits are one T1 call, not fifteen.
- **Fetch the bar once.** Every critic reads the same stored artifacts. Re-fetching per round is pure waste.
- **Stop judging what already won.** A piece that beat the bar is done until the smoothing pass.
- **Reset context instead of growing it.** Long threads re-bill their own history on every call.
- **Size the fan-out to the budget, not to the ambition.** Twenty parallel builders on a budget for eight does not produce twenty pieces, it produces one round and no judgment.

## Budget

If the user stated a budget, honor it exactly. Otherwise set one at run start and record it. A working split:

| Slice | Share |
|---|---|
| Bar acquisition and setup | ≤ 10% |
| Builders | ~55% |
| Critics | ~25% |
| Smoothing and closing | ~10% |

**The critic share is a reserve, not a pool.** Never spend it on more building rounds. A run that exhausts its judgment budget has no method left, only output.

At 80% spent, stop adding rounds to pieces that are winning and put the remainder into the piece furthest from the bar. Budget exhaustion is stopping condition three, and it is the one you can actually measure, so report the number.

## Record it

The progress file carries the routing, not just the verdicts:

```markdown
| Piece | Round | Role | Model | Effort | Verdict | Spend |
|---|---|---|---|---|---|---|
```

Two reasons. The user can see where the money went, and the lead can see a piece eating budget without moving, which is the earliest signal that the gap is structural.

## Failure modes

| Symptom | What it costs |
|---|---|
| Cheap critic | The whole method. Fatal, not expensive |
| Frontier model at max effort on a rename | Pure waste, and the most common one |
| Cheap builder on a piece that needed taste | More than the expensive builder, after four rounds |
| Routing decided ad hoc per spawn | Drift upward, every time |
| Escalating tier without a repeated verdict behind it | Budget spent on a hunch |
| Reasoning effort left at max because it was set once | Silent multiplier on every call in the run |
| No reserve for judgment | The run ends with work nobody judged |
| Fan-out sized by ambition | One expensive round, no second round |
