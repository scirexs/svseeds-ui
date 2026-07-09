# Scope-creep "additions-only" baseline can differ per file once `dev` has merged into the task branch

**Applies to:** Observed in this repo as of commit `4fe5574` (`Merge branch 'dev'`
bringing in `4a45ee2`), git-based scope-creep validation (`git diff --numstat
<baseline> -- <file>`).

## Finding

When a task branch has merged `dev` (or another upstream branch) mid-task, the
correct "additions-only" baseline for a scope-creep check is not necessarily the
same branch/commit for every file. If an upstream commit restructured a source
file *and* updated one of the task's target test files in the same commit (to
match the restructuring), that one test file's correct pre-task baseline is the
upstream commit, not `main` — even though `main` remains correct for every other
file in the same task. Restoring that file to `main` byte-for-byte produces a
test that no longer matches the current (post-merge) source, since the file
being restored is now testing against src that no longer exists in that form.

## Why it matters / how to apply

A single "restore all N files to baseline `main`" instruction is unsafe once a
`dev`-style merge has landed on the task branch. Before prescribing (or
mechanically executing) a byte-for-byte restoration:

1. Check whether `dev`/upstream merge commits exist on the task branch
   (`git log --merges`).
2. For each file being restored, check whether an upstream commit touched both
   the corresponding source file and this test file in the same commit
   (`git log <file>`). If so, that file's baseline is that upstream commit, not
   `main`; run the restored file against the current source to confirm it still
   passes before treating the restoration as done.
3. Different files in the same task may legitimately need different baselines —
   don't assume one branch/commit baseline applies uniformly across a batch.

Skipping this check costs a full blocked-then-refix round trip: a fix that
restores everything to `main` will fail validation for the one file whose
source moved out from under it, and the failure (`track_reactivity_loss` /
"received value ... Null" style errors) does not obviously point back to a
baseline mismatch.

## References

Task `20260709_xr344d`: `request-fix2.md` prescribed `main` as the baseline for
five files; `tests/Popover.svelte.test.ts` blocked because `Popover.svelte` had
been restructured by dev commit `4a45ee2` in the same commit that updated that
test file. `request-fix3.md` corrected the baseline to `4a45ee2` for that one
file only, leaving `main` correct for the other four.
