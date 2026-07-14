# `bun run fmt` reformats all of `src` and `tests`, not just changed files

**Applies to:** this repo as of prettier `^3.8.5`. The format scripts take
**two** independent variable targets, each with a whole-tree default:
`fmt` = `bunx prettier --write ${BUN_FMT:-./src} ${BUN_TEST:-./tests}`,
`fmt:check` = `bunx prettier --check ${BUN_FMT:-./src} ${BUN_TEST:-./tests}`.

## Finding
With no `BUN_FMT`/`BUN_TEST` set, `fmt` runs `prettier --write` over both the
whole `./src` and `./tests` trees, so it rewrites every source *and* test file
whose current formatting differs from prettier's output — including files
unrelated to the task. The repo currently has pre-existing formatting drift
(e.g. `FileField.svelte`, `Tooltip.svelte`, `WheelPicker.svelte`), so a scoped
task that runs the default `bun run fmt` (or `bun run fmt:check`) for
validation picks up that unrelated churn / noise in its result. Test files
under `tests/` carry their own pre-existing drift (e.g. multi-statement
one-liners that prettier expands).

Crucially, **the two globs are independent**: setting only `BUN_FMT` (to scope
the source side) still leaves `${BUN_TEST:-./tests}` at its whole-tree default,
so the check still walks every file under `tests/` — reporting unrelated
pre-existing test-file drift as if it were caused by the task. Scoping requires
setting **both** vars when the task touches both source and test files.
Markdown files under `.ws/` are subject to the same issue: if the request's
validation scope includes a markdown file, Prettier checks the entire file and
will flag any pre-existing formatting outside the edited line range.

## Why it matters / how to apply
For a scoped change, validate formatting with the **check-only** script,
narrowing **both** targets via `BUN_FMT` (source) and `BUN_TEST` (tests) —
space-separated, and omit whichever side the task didn't touch by pointing it
at an empty/no-op path:

```
BUN_FMT="src/lib/_svseeds/Foo.svelte src/lib/_svseeds/Bar.svelte" \
BUN_TEST="tests/Foo.svelte.test.ts tests/Bar.svelte.test.ts" \
bun run fmt:check
```

This is the standard validation form for review (non-destructive, scoped). Use
the default `bun run fmt:check` only for an intentional repo-wide check, and the
`--write` `bun run fmt` only for an intentional formatting pass. The scripts read
`.gitignore` by default (prettier 3), so no `--ignore-path` is needed.

## References
`package.json` `fmt` / `fmt:check` scripts; `.ws/policy/coding-style.md` §0
(validation commands); `feedback-implementer.md` and `review-result.md` of task
20260629_quy35s (review verified formatting with a scoped `prettier --check`);
`feedback-implementer.md` and `feedback-reviewer.md` of task 20260711_kg2wt5
(confirmed `BUN_TEST` is a second, independent default that `BUN_FMT` alone
does not scope); `feedback-implementer.md` of task 20260714_ng2abi (request's
own `Validation` section set only `BUN_FMT`, intending to exclude touched test
files from the format gate — the literal command still walked all of
`./tests` via the `BUN_TEST` default).
