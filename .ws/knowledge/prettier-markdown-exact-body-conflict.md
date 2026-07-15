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

Task `20260713_nqqeqr`: recurred with `.ws/decision/011-calendar-page-transition.md`.
`request.md` already scoped `BUN_FMT`/`BUN_TEST` to the changed product files and
stated the ADR is excluded, but `review` manually widened `BUN_FMT` to include the
ADR anyway and reported the resulting failure as blocking; `analyze` ruled it a
review over-scope, not a defect — the request-scoped command passed as stated.

Task `20260714_mts25u`: recurred with `.ws/decision/017-contextmenu-touch-long-press.md`
(a long Markdown header line specifically). This time `request.md`'s Validation
section scoped both `BUN_FMT` and `BUN_TEST` to only the changed source/test file
from the start and neither `impl` nor `review` widened it — the guidance above was
followed correctly and produced no findings, only a repeat knowledge candidate.

Task `20260715_ww5zy5`: recurred with `.ws/decision/018-dateinput-overlay-default-z-index-via-cssvar.md`.
`request.md` again scoped `fmt:check` to only the changed product files from the
start; `review` additionally verified the exact-body contract by diffing the
created ADR directly against the request's fenced body rather than re-reading it
loosely. No findings — the guidance held and the diff-against-fenced-body check is
a useful verification step for future exact-body ADR reviews.
