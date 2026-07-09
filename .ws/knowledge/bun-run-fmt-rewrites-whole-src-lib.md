# `bun run fmt` reformats all of `src/lib`, not just changed files

**Applies to:** this repo as of prettier `^3.8.5`. The format scripts take a
variable target with a whole-tree default:
`fmt` = `bunx prettier --write ${BUN_FMT:-./src/lib}`,
`fmt:check` = `bunx prettier --check ${BUN_FMT:-./src/lib}`.

## Finding
With no `BUN_FMT` set, `fmt` runs `prettier --write` over the whole `./src/lib`
tree, so it rewrites every source file whose current formatting differs from
prettier's output — including files unrelated to the task. The repo currently
has pre-existing formatting drift (e.g. `FileField.svelte`, `Tooltip.svelte`,
`WheelPicker.svelte`), so a scoped task that runs the default `bun run fmt`
(or `bun run fmt:check`) for validation picks up that unrelated churn / noise in
its result. Test files under `tests/` carry their own pre-existing drift
(e.g. multi-statement one-liners that prettier expands), so even a
`BUN_FMT`-scoped `fmt:check` limited to edited test files may report failures
that pre-date the task's changes. Markdown files under `.ws/` (e.g.
`overview.md`) are subject to the same issue: if the request's validation scope
includes a markdown file, Prettier checks the entire file and will flag any
pre-existing formatting outside the edited line range.

## Why it matters / how to apply
For a scoped change, validate formatting with the **check-only** script narrowed
to the files you touched via the `BUN_FMT` env var (space-separated):

```
BUN_FMT="src/lib/_svseeds/Foo.svelte src/lib/_svseeds/Bar.svelte" bun run fmt:check
```

This is the standard validation form for review (non-destructive, scoped). Use
the default `bun run fmt:check` only for an intentional repo-wide check, and the
`--write` `bun run fmt` only for an intentional formatting pass. The scripts read
`.gitignore` by default (prettier 3), so no `--ignore-path` is needed.

## References
`package.json` `fmt` / `fmt:check` scripts; `.ws/policy/coding-style.md` §0
(validation commands); `feedback-implementer.md` and `review-result.md` of task
20260629_quy35s (review verified formatting with a scoped `prettier --check`).
