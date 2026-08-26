# Quality bars by domain

The bar is the only thing stopping the agent from settling. It must be concrete, external to the agent, and inspectable inside the run.

Fast test: **can the critic open the bar and our output side by side and say which one is better?** If the answer is "sort of", the bar is weak.

## Contents

- [Visual and 3D](#visual-and-3d)
- [Front end, landing pages, websites](#front-end-landing-pages-websites)
- [Product and application UI](#product-and-application-ui)
- [Backend, APIs, infrastructure](#backend-apis-infrastructure)
- [Mobile](#mobile)
- [Writing and content](#writing-and-content)
- [Design and visual identity](#design-and-visual-identity)
- [Research and analysis](#research-and-analysis)
- [Data and pipelines](#data-and-pipelines)
- [Marketing and campaigns](#marketing-and-campaigns)
- [When no obvious bar exists](#when-no-obvious-bar-exists)

## Visual and 3D

- Real screenshots of the reference product, downloaded into the repo, at matching resolution and equivalent framing.
- Frames captured from a competitor's gameplay or demo reel.
- Reference renders with stated lighting conditions (same time of day, same material type).

Inspection: the critic renders our scene at the same angle, saves the PNG, and compares it blind against the reference.

## Front end, landing pages, websites

- Three to five real URLs of the best pages in the category, opened in a real browser by the critic, desktop and mobile.
- Lighthouse or Core Web Vitals with a stated numeric target (LCP, CLS, INP).
- Screenshots of the reference page at 1440px and 390px.
- WCAG AA contrast as a non-negotiable floor.

Inspection: real browser, paired screenshots, blind comparison. Never judge from a description of the HTML.

## Product and application UI

- The equivalent flow in a reference product, recorded step by step: click count, loading states, error handling.
- Steps-to-task-completion measured against the competitor's.
- Mandatory states covered: empty, loading, error, success, offline, overflowing content.

Inspection: the critic performs the task in our product and in the reference, timing and counting steps.

## Backend, APIs, infrastructure

- A test suite that runs and passes, failure paths included.
- Stated latency targets (p50, p95) measured under synthetic load.
- A failure-recovery test: kill a dependency and verify behavior.
- A security review against a checklist (OWASP, plus the applicable data protection regime).
- An open reference implementation of the same class of service.

Inspection: run it, measure it, read the output. The bar is numeric here and the critic does not negotiate with it.

## Mobile

- Measured cold start time against a reference app in the same segment.
- Frame rate during a scroll of the heaviest list.
- Screenshots of the reference app on matching screens.
- Bundle size and memory footprint with stated targets.

## Writing and content

- A set of reference paragraphs with the density and clarity you want. The question is "is every paragraph of ours at least as clear as this?", never "does it sound like this author?".
- Competing articles ranking for the same search intent, as a coverage and depth bar.
- Hard metrics where the format allows: verifiable claims per section, information per paragraph, absence of sentences that carry no content.
- A final humanization pass to strip AI-writing tells.

Inspection: the critic reads the finished text, not the outline.

## Design and visual identity

- Public design systems as a consistency bar for tokens.
- Real pieces from brands at the same positioning, compared in pairs.
- Grid, type scale, and palette declared as verifiable constraints.

## Research and analysis

- A reference report or paper of comparable scope.
- A minimum count of distinct, independent primary sources.
- Every central claim traceable to a source, spot-checked by the critic.
- A falsification test: the critic actively hunts for the evidence that breaks the conclusion.

## Data and pipelines

- Reconciliation against the system of record (totals match to the cent or to the row).
- A stated ceiling on dropped records.
- Deterministic re-execution: same input, same output.
- A wall-clock target for the pipeline.

## Marketing and campaigns

- Real creatives from campaigns in the same segment that verifiably performed.
- Industry CTR and conversion benchmarks as a floor.
- A five-second test: can the critic say what the product is from the asset alone?

## When no obvious bar exists

Do not tell the agent to "decide what good means". Tell it this:

> Find a concrete comparison or measurement that plays the same role for this task that real Call of Duty screenshots played for the Claude of Duty game. Explain in one sentence why it is a useful bar and how you will inspect it. Judge every round against it.

Then sanity-check the proposed bar against the fast test at the top of this file before the build starts. A weak bar accepted early contaminates the whole run.
