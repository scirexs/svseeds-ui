# `bun run fmt` reformats all of `src/lib`, not just changed files

**Applies to:** this repo as of prettier `^3.8.5`; `fmt` script =
`bunx prettier --write ./src/lib --ignore-path .gitignore`.

## Finding
The `fmt` script runs `prettier --write` over the whole `./src/lib` tree, so it
rewrites every source file whose current formatting differs from prettier's
output — including files unrelated to the task. The repo currently has
pre-existing formatting drift (e.g. `FileField.svelte`, `Tooltip.svelte`,
`WheelPicker.svelte`), so a scoped task that runs `bun run fmt` for validation
picks up unrelated formatting churn in its diff.

## Why it matters / how to apply
For a scoped change, do not run `bun run fmt` as a way to leave the tree
formatted — it pollutes the diff with unrelated files. To check only the files
you touched, use a check-only invocation scoped to those paths, e.g.
`bunx prettier --check <changed files> --ignore-path .gitignore`. Reserve the
repo-wide `--write` for an intentional formatting pass.

## References
`package.json` `fmt` script; `feedback-implementer.md` and `review-result.md`
of task 20260629_quy35s (review verified formatting with `prettier --check`
instead).
