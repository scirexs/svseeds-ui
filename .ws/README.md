# .ws/ — Workspace Index

`.ws/` holds the shared context for the multi-agent collaborative development
workflow: project architecture, design decisions, accumulated knowledge,
conventions, and per-task working materials.

This file is the index of `.ws/`. For the operating model of the agent
collaboration system, see `collaboration/agent-collaboration.md`.

## Directories

- `architecture/` — The product's own architecture (agent B's domain).
  - `overview.md` — System overview (whole system / purpose / structure
    summary / directory layout).
- `collaboration/` — How the multi-agent development process itself works
  (reference material; not the product's architecture, so out of scope for
  agent B's overview-update rules).
  - `agent-collaboration.md` — Operating model of the multi-agent workflow
    (phases / agent roles / status flow / governance).
  - `json-definition.md` — Authoritative JSON schemas for the workflow's data
    (`status.json`, `report.json`, `stats.jsonl`, `signals.jsonl`,
    `.agent-assignment.json`).
- `decision/` — Design-intent documents (ADRs). One decision per file,
  append-only; changes are made by superseding with a new file.
- `knowledge/` — Reusable findings discovered during work.
  - `INDEX.md` — Index of knowledge files.
- `policy/` — Project conventions, rules, and formats. (`-guide` denotes
  "rule + rationale + template".)
  - `coding-style.md` — How code should be written.
  - `compound-components.md` — Project-specific patterns for components that wrap
    or coordinate other components (linked from `coding-style.md` §15).
  - `request-guide.md` — How to write a change request (`request.md`).
  - `knowledge-guide.md` — Guidance for authoring knowledge entries.
  - `decision-guide.md` — Spec-deciding and design-intent (ADR) authoring rules.
  - `review-guide.md` — Review criteria and the blocking / non-blocking
    boundary (`needs_fix` / `pass` split).
  - `signals-guide.md` — `causes` enum definitions for `signals.jsonl` and the
    "primary improvement target" mapping (shared vocabulary for agents G/H).
  - `optimize-guide.md` — Format, scope, and governance for process-improvement
    proposals (`.ref/z-human/opt/`), shared by agents F (single-task) and H
    (cross-task).
- `task/` — Per-task working materials.
  - `INDEX.tsv` — History of branch names / work summaries.
  - `stats.jsonl` — Model-behavior and cost-analysis statistics.
  - `signals.jsonl` — Statistics for document / skill improvement.
  - `.periodic-opt-state` — Last `signals.jsonl` position analyzed by the
    periodic optimizer (agent H). Not tracked by git.
  - `.agent-assignment.json` — Model / prompt settings used by the
    orchestrator. Not tracked by git.
  - `YYYYMMDD_xxxxxx/` — Per-task directory. Not tracked by git. Holds the
    task's `draft.md`, `status.json`, `request.md` (and `request-fixN.md`),
    `handover-notes.md`, `review-result.md`, `feedback-*.md`, transient
    report / result files, and an `archive/` of retry traces.
- `task-record/` — Archive of feature-change requests.
  - `YYYYMMDD_xxxxxx.md` — A completed `feat` task's `request.md`, renamed and
    kept as history.

## Git management

- `.ws/` is tracked by git by default.
- Exceptions (not tracked): `/.ws/task/YYYYMMDD_xxxxxx/` task directories and
  operation-only files. These are excluded via `.gitignore` rules
  `/.ws/task/*/` and `/.ws/task/.*`.
