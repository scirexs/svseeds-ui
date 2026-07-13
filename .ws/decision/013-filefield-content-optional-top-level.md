# 013. Keep FileField's `content` optional at the top level, not folded into `fileInput`

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-13
**Affects:** FileField public props API (`content` becomes optional)

## Context

`FileField` wraps a default `<FileInput>` and passes the `content` snippet through
as that input's required `children` (its drop-zone content). `content` was a
**required** top-level prop. But `FileField` also supports a wrapper usage where
the caller supplies their own control as `children`
(`<FileField><FileInput/></FileField>`); in that mode `content` (and the
`fileInput` config bag) are unused, yet the required type still forced callers to
pass a throwaway `content`.

Two shapes could fix this:

1. Keep `content` at the top level and make it optional.
2. Remove top-level `content` and move it into the existing `fileInput` bag as
   `fileInput.children` (the bag already forwards to the default `<FileInput>`),
   so all default-input configuration lives in one place and the bag's required
   `children` gives a tighter compile-time guarantee.

## Decision

Take option 1: `content` stays a top-level prop and becomes optional
(`content?`), and the default `<FileInput>` is rendered only when `content` is
present. `FileFieldReqdProps` becomes `never`.

## Consequences

- The primary usage `<FileField content={...} />` keeps its concise, flat form;
  no caller has to nest zone content under `fileInput={{ children: … }}`.
- The change is source-compatible: existing callers that already pass `content`
  are unaffected.
- The compile-time guarantee is softer than option 2: the type no longer forces
  `content` for the default-input path. Supplying neither `content` nor
  `children` renders no control instead of erroring — an accepted trade for the
  ergonomics of the common path.

## Rejected alternatives

- **Fold `content` into the `fileInput` bag (`fileInput.children`).** Conceptually
  cleaner — one bag for all default-input config, with a required `children`
  enforcing zone content whenever the default input is configured. Rejected
  because it penalises the *common* case: the primary, most-frequent usage
  (default input with zone content) would have to nest into
  `fileInput={{ children: … }}`, trading everyday ergonomics for a guarantee that
  only matters in the rarer degenerate case. It is also a larger breaking change
  across callers, tests, and the type annotations.
