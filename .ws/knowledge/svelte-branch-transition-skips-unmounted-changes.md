# A keyed transition on one branch of `{#if}/{:else}` can't capture a value change made while that branch is unmounted

**Applies to:** Svelte 5 (runes), an element carrying `transition:fn|local`
that lives in only one branch of a conditional (`{#if cond}...{:else}...{/if}`)
and is re-keyed (`{#key value}`) on a value change — observed in this repo's
`Calendar.svelte` `pageTransition` feature.

## Finding

If the transitioned element exists only in the `{:else}` (or `{#if}`) branch,
any change to the key value that happens while the *other* branch is active
has no live instance of that element to re-key or transition — the change is
invisible until the branch containing the element remounts. On remount,
`|local` (by design) suppresses the intro, so the value change that happened
off-branch never plays the transition, no matter how the trigger path is wired.
Detecting the value change (e.g. computing a direction) in a shared, branch-
agnostic place does **not** by itself make the transition play for changes
that originate from the other branch — the target element's mount lifecycle
gates it independently of where the change is detected.

## Why it matters / how to apply

Before requiring an off-branch actor (e.g. a sibling picker component) to
trigger a same-branch keyed transition, trace whether the transitioned element
is actually mounted for the full duration of that actor's interaction. If it
is not, the requirement is unsatisfiable without either dropping `|local` (so
the remount itself plays the transition — but then unrelated mount/unmount
switches also animate) or restructuring the anatomy so the element stays
mounted (keeping it visually hidden instead of conditionally unmounted). A
central "detect the direction/delta" effect covering all trigger paths is not
sufficient evidence that all paths visually transition.

## References

Task `20260713_nqqeqr`: Calendar's `pageTransition` prop needed to slide
`.main` on month change; `dir` detection in a shared `$effect.pre` correctly
covered every trigger path (prev/next, keyboard, date-select, MonthPicker,
external `display`), but MonthPicker-originated changes could never play the
slide because `.main` only exists in the not-`picking` branch and remounts
with `|local` suppressing the intro when `picking` closes.
