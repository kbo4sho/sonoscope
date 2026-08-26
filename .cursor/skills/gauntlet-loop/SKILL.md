---
name: gauntlet-loop
description: Turns an ambitious request into a self-judging, self-improving agent run instead of a first draft. Sets a concrete external quality bar, splits the goal into judgeable pieces, gives each one a separate critic with clean context, forces blind A/B against the bar, and loops with no fixed round count. Routes every spawned agent to the cheapest model and effort that can do its job, so fan-out does not burn tokens. Use for ANY complex or open-ended build, not only games. Trigger when asked to build, create, design, refactor, redesign, optimize or "make excellent" any artifact (app, site, UI, game, API, service, pipeline, report, article, campaign, research), and on goal, loop, gauntlet, fan out, subagents, AAA, production quality, best in class, keep improving, compare against a reference, or any concern about token cost, budget, model choice or reasoning effort in a multi-agent run. Also when a broad goal arrives with no implementation detail, or when about to ship a first draft as final.
---

# Gauntlet Loop

The method behind Claude of Duty, generalized to any work an agent can inspect. One prompt produced roughly 55,000 lines of a playable AAA-style shooter with zero human steering. The model was not the differentiator. The loop was.

Core cycle:

**Split → build → judge against an external bar → repeat.**

Method by Matt Shumer. See `references/origin.md`.

## Execution contract

**You run this protocol. The user does not.**

When this skill fires, do not hand back a prompt, a plan for approval, or a description of what a Gauntlet Loop would look like. Set the bar, decompose the goal, spawn builders and critics, run the rounds, and deliver the finished artifact.

The user gave a goal once. Everything after that is yours.

- **Ask no clarifying questions.** Every unknown is a decision you make and record in the final summary.
- **Choose the bar yourself.** State it in one sentence, then proceed. Never ask which reference to use.
- **Route the models yourself.** Pick the model and reasoning effort for every spawned agent from what the harness offers. Never ask the user which model to use, and never leave everything on the session default.
- **Report nothing mid-run.** Progress goes to the live progress file, not into the conversation.
- **Interrupt only** for a blocked credential, a missing paid resource, or an instruction that would cause harm.

If the user explicitly asks to be consulted at checkpoints, honor that. Absent that signal, run to completion.

## When it applies

Three conditions:

1. The request is to create or improve something, not to answer a question.
2. The output can be objectively inspected: rendered, executed, opened, measured, tested, read.
3. More than one round is affordable.

Skip it for lookups, one-line fixes, and explanations. It costs real compute and only pays off when quality matters more than speed.

## Runbook

### 1. Detect the harness

Read `references/harness-setup.md` and pick the wiring before doing anything else. It determines whether critics come from parallel subagents, separate sessions, or hard-separated passes. Never announce this step, just adapt.

While you are there, enumerate the models and reasoning-effort settings this harness exposes. You cannot route what you have not listed.

### 2. Set the budget and the routing table

The loop multiplies calls. Left unrouted, every one of them inherits the session's model and effort, and a fan-out of mechanical edits runs on a frontier model at maximum reasoning for no gain.

Read `references/model-routing.md` and decide, once, before building:

- **The tiers.** Map the available models onto T0 (a command, no model), T1 (small and fast), T2 (mid), T3 (frontier at high effort).
- **The table.** Which role gets which tier: lead and every judgment call at T3, standard building at T2, mechanical edits and bookkeeping at T1, anything a command can verify at T0.
- **The budget.** Honor the user's if they gave one, otherwise set one, and hold roughly a quarter of it in reserve for critics.

Two rules override any saving. **Judgment is never routed to the cheapest tier**, because a weak critic approves early and cancels the method. And **a piece that is about taste or novelty starts high**, because a cheap builder losing four rounds costs more than an expensive one winning in one.

Record the table in the progress file. Do not announce it, and do not ask the user to approve it.

### 3. Set the bar

The bar decides whether the run works at all. Not bars: "make it amazing", "production quality", "follow best practices". A bar is a real external artifact or measurement the output can be placed next to and lose against.

Pick one using `references/quality-bars.md`, which covers visual work, front end, product UI, backend, mobile, writing, design systems, research, data, and marketing.

Rules:

- **Inspectable inside the run.** A screenshot saved to the workspace, a URL you can open, a suite that executes, a file you can read. Not a bar remembered from training.
- **Does not need to be reachable.** Claude of Duty never beat Call of Duty. The bar exists to stop the run from settling at "good for AI".
- **Cleared on round one means it was too low.** Raise it and continue.

Fetch or generate the bar artifacts now, before any building, and store them in the workspace so every critic can reach them.

### 4. Take the goal, not the implementation

Do not prescribe your own architecture up front, and do not accept a decomposition invented before looking at the artifact. Restate the destination and let the shape emerge.

If the user fixed a stack or an architecture, that is a real constraint. Respect it and leave everything else open.

### 5. Split the work

Break the goal into the **smallest pieces that can be improved and judged separately**, and decide which run in parallel.

Granularity is the leverage. "Make the site better" is untreatable. "Make this pricing section beat the reference pricing section" is a problem you can attack until you win. Same for "make p95 beat 120ms under this load" and "make this paragraph at least as clear as this reference paragraph".

### 6. Build and judge, never in the same context

For each piece, one builder and one separate critic. Always different contexts, never the same agent.

The builder saw every decision and remembers why it made them, which makes it excellent at explaining why the result is reasonable. Reasonable is not the target.

Brief them using `assets/delegation-templates.md`. The critic receives the goal, the bar, the constraints, and the real artifact. It never receives the builder's transcript, the builder's explanation, or which side is ours.

Route each spawn as you make it, using the table from step 2. Ask the three questions before every builder: is success checkable by a command (no model, run it), is the target state already fully specified (smallest model, minimal effort), or does closing the gap require deciding what good looks like (frontier). Critics judging taste are always frontier; critics checking a number run the command first and only need a small model to report it.

Full procedure in `references/critic-protocol.md`. Essentials: blind A/B, inspect the real thing, binary verdict, name the single largest gap, send it back.

### 7. Keep looping

Never set a round count. Any agreed final round becomes a ceiling.

Stop when one of these is true, and record which one:

1. The user calls it done from the progress file.
2. Per-round gains stopped mattering for the goal.
3. The compute budget ran out, measured against the budget set in step 2.

Move a piece up a tier only on evidence: two consecutive losses on the same gap raise its effort, a third raises its model. A piece that starts winning drops back down for the rest of the run. At 80% of budget spent, stop adding rounds to pieces that are already winning and put the remainder into the piece furthest from the bar.

If the same gap survives three consecutive rounds, stop that piece and re-decide at the lead level. It is structural, or the bar is wrong for that piece, or builder and critic are measuring different things. Spending more on it at that point is the most common way to burn a budget on nothing.

### 8. Keep a live progress file

Maintain a simple HTML page or markdown file in the workspace, updated as work lands: screenshots, drafts, test results, round-by-round verdicts, open gaps. Do not over-specify the format, and tell the user where it is in your first line of output.

This exists so the user can watch without interrupting. Interruption costs a context window and breaks the loop.

### 9. Smoothing pass between waves

When many agents edit separate parts of one artifact, the parts get individually good and collectively incoherent.

At the end of each major wave, spawn one fresh agent to inspect the whole result, resolve conflicts, and make it feel like one thing. It does not redesign anything.

Useful, not core. The core stays: split, build, judge, repeat.

## Closing the run

Deliver the artifact, then a short summary containing:

- The bar used and why.
- How far the work got against it.
- The last unclosed gap, which is the handoff for whoever picks it up next.
- Assumptions made in place of questions not asked.
- Which stopping condition ended the run.
- What it cost: rounds run, roughly where the budget went, and any piece that consumed a large share without moving.

No praise for the work. The critic's verdicts already said everything that matters.

## Anti-patterns

| Symptom | Fix |
|---|---|
| Handing the user a prompt to run themselves | Execute the protocol, that is the whole point |
| "This looks great!" from the builder | Spawn a critic with clean context, no history |
| Critic reading a report instead of the artifact | Force inspection of the real output |
| Subjective bar ("world class", "Apple-level") | Replace with a concrete artifact you can open |
| Decomposition fixed before seeing the artifact | Let the shape emerge from the work |
| "Do 3 iterations" | Open loop with an explicit stopping condition |
| Asking which reference to use | Choose one, justify in a sentence, proceed |
| Status updates in the conversation | Live progress file |
| Good parts, incoherent whole | Smoothing pass at the end of the wave |
| Bar cleared on round one | The bar was too low, raise it |
| Same gap surviving three rounds | Escalate, it is structural |
| Every agent inheriting the session model and effort | Route each spawn: frontier for judgment, small for mechanical work |
| Frontier model at max effort renaming a variable | T1 at minimal effort, or a command with no model at all |
| Cheap critic, to save a round | Rule zero. A weak critic approves early and cancels the method |
| Cheap builder on a piece that is about taste | Four losing rounds cost more than one expensive win |
| Raising the tier because a piece feels hard | Escalate on repeated verdicts, not on hunches |
| Critic budget spent on extra build rounds | The reserve is not a pool. Judgment gets it |
