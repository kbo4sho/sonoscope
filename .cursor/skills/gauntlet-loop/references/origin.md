# Origin

This protocol is a packaging of the **Gauntlet Loop**, a method created and published by **Matt Shumer**.

- Article: [How to Run a Gauntlet Loop](https://somethingbig.ai/gauntlet-loop)
- Demonstration: [Claude of Duty](https://github.com/mshumer/Claude-of-Duty), a Call of Duty-class FPS in Three.js built from a single prompt
- Author: [@mattshumer_](https://x.com/mattshumer_)

The ideas below are his. This repository only turns them into a reusable skill.

## What happened

Matt gave Claude Code a single prompt and left. The agent worked for hours, spawned a large fleet of subagents, wrote roughly 55,000 lines of code, and generated every texture, mesh, animation and sound in code from scratch. No steering.

The result was far better than what other people were getting from the same model, so it was widely assumed to be fake. The prompt and the full source were published. Skeptics ran it themselves and ended up with working games. Others adapted it to work that had nothing to do with games.

The difference was never the model. It was that the agent was never allowed to stop at one decent result.

## The original prompt

Three paragraphs. No architecture, no task list, no round count.

```
I want you to build a first-person shooter at the level of the most recent
Call of Duty games. It should be utterly perfect, visually beautiful, with
every single thing done at AAA quality, from textures to physics to anything
you could think of.

Fan out sub-agents and have sub-agents tackle each one individually so that
the game is utterly perfect. You should /loop on each item and have a separate
sub-agent check it visually to ensure it looks triple A. That separate
sub-agent should be a really harsh critic, and if it doesn't look triple A,
it should keep going.

Don't stop until each sub-agent is utterly wowed with the quality when
compared with the actual Call of Duty game. It should literally compare them
side by side blind and say which one looks better. Do this in ThreeJS. /loop
until it's utterly perfect. Fan out sub-agents and ultracode.
```

Source: https://github.com/mshumer/Claude-of-Duty/blob/main/prompt.md

## What that prompt actually contains

Everything in this skill decomposes back to five moves present in those three paragraphs:

1. An ambitious goal with no implementation details.
2. A concrete external bar the agent can inspect: the real game, compared side by side.
3. Fan-out, with each piece owned and improved independently.
4. A separate, harsh critic doing a blind comparison, never the builder grading itself.
5. No final round.

Everything else in this repository is adaptation: how to choose the bar when your work is not a game, how to keep a critic honest, how to run it on harnesses without subagents.
