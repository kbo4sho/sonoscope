# Harness setup

The loop needs three capabilities. Everything else is convenience.

1. **Inspection**: the agent can render, execute, open, or measure its own output.
2. **Independent context**: the critic can judge without inheriting the builder's reasoning.
3. **Persistence**: the run continues across many rounds without human input.

Any harness with these can run the loop. What changes is the wiring. Detect which case applies and adapt silently.

A fourth capability is not required but changes the economics: **per-agent model and effort selection**. Where it exists, use it. Where it does not, route with what you have, which is usually the effort dial or a separately configured session. Each section below states what the harness exposes. The routing decisions themselves are in `model-routing.md`.

## Claude Code

Native fit. This is where the method was demonstrated.

- **Fan out**: Task subagents. Each gets its own context window, exactly what an independent critic requires.
- **Per-agent routing**: subagent definitions accept a `model` in their frontmatter, and spawns accept a model and an effort level per call. Use both. The lead running at high effort does not mean its workers should.
- **Effort**: for serious runs, the user can raise reasoning effort with `/effort` and select `ultracode`. It costs meaningfully more and produces better work on large multi-agent runs. Mention it once, in the first line of output, then run anyway. Raising the session's effort is not a reason to leave mechanical workers there.
- **Repetition**: the `/loop` skill handles repeated passes when available. The important part is not the command, it is the absence of an agreed final round.
- **Inspection**: browser automation for rendered pages, screenshot capture for visual comparison, direct execution for tests and benchmarks.
- **Progress file**: a plain HTML file in the workspace, rewritten as work lands.

Spawn one builder and one critic per piece. Never reuse a builder as a critic. Never pass a builder transcript to a critic.

## Codex

Works well, with different wiring and different strengths.

- **Strengths**: backend engineering, systems work, test-driven pieces, and judging a rendered result. Weaker than Opus-class models at producing high-end visual output in the first place.
- **Independent context**: separate sessions or worker threads where in-process fan-out is unavailable. In that case, run the loop as explicit sequential rounds with a hard context reset between the build pass and the critique pass.
- **Per-agent routing**: `model` and `model_reasoning_effort` (minimal, low, medium, high, xhigh) in `config.toml`, and named profiles in their own files, launched with `--profile`. Define a cheap profile and a deep profile once, then run mechanical passes under the cheap one and judgment under the deep one. Subagents, where the build has them, can carry their own model.
- **Slash commands differ**: do not assume `/loop`, `/effort` or `ultracode` exist. Replace them with plain behavior: repeat rounds until the reference stops winning, and set reasoning effort per pass rather than pinning the whole run at the top.
- **Loading the skill**: if the harness does not autoload skills, reference `gauntlet-loop/SKILL.md` from `AGENTS.md`. The protocol depends on no skill-loading mechanism.
- **Strong pairing**: a visual-strong model builds, Codex critiques. Separation of builder and critic is easiest to enforce when they are different models entirely.

## Cursor

- **Fan out**: subagents where the build offers them. Otherwise sequential rounds with a fresh session for each critique.
- **Per-agent routing**: subagent frontmatter takes `model`, which accepts `inherit`, a fast tier, or a specific model id. Never leave a mechanical worker on `inherit` when the parent is running a frontier model. Built-in subagents pick their own model, which is usually the right call for retrieval and shell work.
- **Inspection**: the workspace and terminal are available, so render, execute and measure directly rather than reasoning about the code.
- **Invocation**: the skill fires on its own, and can also be called explicitly from the slash-command menu.
- **Progress file**: a markdown file in the workspace, kept open in a second tab.

## GitHub Copilot and VS Code

- **Agent mode only.** Inline completion cannot run the protocol.
- **Independent context**: a new agent session for the critique pass, with the artifact path and the bar, never the build transcript.
- **Per-agent routing**: model selection is per session through the picker rather than per spawned worker. Route by session: cheap model for the mechanical and retrieval passes, frontier for building the hard pieces and for every critique.
- **Repository-scoped installs** also reach the cloud agent and code review, which makes the critic pass reusable on pull requests.

## Other agentic harnesses

Check the three capabilities, then substitute:

| Need | Substitute |
|---|---|
| Fan out | Sequential rounds, one piece at a time |
| Clean critic context | New session, new thread, or a different model |
| Blind A/B | Neutral filenames, randomized order, no labels in the brief |
| Live progress file | Append-only markdown in the workspace |
| Open loop | Explicit repeat-until instruction plus a recorded stopping condition |
| Per-agent model selection | Separate sessions or profiles per tier, or the effort dial alone |

Through a router such as OpenRouter, or any raw API, enumerate the model list at run start and route by price and capability. That is the case where routing pays most, because the whole tier range is available in one place.

## Plain chat, no tools

The loop degrades here. Say so once, then run the best available version rather than refusing.

- Hard-separate the passes: build, then inspect. Never in the same reasoning step.
- In the critique pass, deliberately discard why the decisions were made and judge only the artifact.
- Ask for the artifact back in inspectable form before judging, when the user can provide it.
- Expect leniency. A model critiquing its own output in the same context approves it more often than an independent critic would.

## Model selection

Full routing table, tiers, escalation ladder and budget split in `model-routing.md`. The three rules that never change:

- **Builder** for visual and creative production: the strongest frontier model available.
- **Critic**: any strong reasoning model, and a *different* model from the builder is a bonus, since it shares none of the builder's blind spots.
- **Never a cheap model as critic.** A weak critic approves early, which defeats the entire method. If the budget is tight, save on the builder's rounds, not on judgment.

Everything else is negotiable, and most of it should be routed down. Mechanical edits, retrieval, bookkeeping and anything a command can verify do not need the model the lead is running on.
