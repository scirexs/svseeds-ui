# Prettier reformats Markdown, conflicting with exact-body doc contracts

**Applies to:** this repo's `bun run fmt` / `fmt:check` (Prettier) as configured
to cover Markdown files (e.g. `.ws/decision/*.md`).

## Finding

When a document (e.g. an ADR) must contain an exact, verbatim text body,
running `fmt:check` over that file fails: Prettier's Markdown formatting
(line wrapping, spacing, etc.) does not preserve hand-authored exact wording.
This is expected, not a defect in either the doc or the formatter.

## Why it matters / how to apply

Scope `BUN_FMT` / `fmt:check` to exclude any file with an exact-body
contract; do not add such files to the format-check gate, and do not
"fix" the mismatch by reformatting the file (that would break the required
exact wording). A task request that creates such a file should explicitly
state the format-check scope excludes it.

## References

Task `20260709_qzv7t6`: `.ws/decision/005-bind-this-vs-dom-query.md` has an
exact-body contract; `request.md`'s Validation section scopes `BUN_FMT` to only
the two changed `.svelte` files for this reason.
