# Browser default `<ul>`/`<ol>` margin defeats absolute-overlay anchor geometry

**Applies to:** Browser default (UA) stylesheets generally — any `<ul>`/`<ol>` used as an
absolutely-positioned overlay without explicit `margin:0`. Observed in chromium via ADR
019 in svseeds-ui.

## Finding

Browsers' default UA stylesheet applies a non-zero margin to `<ul>`/`<ol>` elements. When
such a list is used as an absolutely-positioned overlay (`position:absolute` inside a
`position:relative` containing block), that default margin sits inside the element's own
box model and offsets it from the anchor even when the containing block and the anchor
expression (`top:100%`, etc.) are both computed correctly. The math can be exactly right
and the overlay still lands with an unexplained gap.

## Why it matters / how to apply

Any component that anchors a `<ul>`/`<ol>` overlay against a percentage-based position
must reset `margin:0` on that element as part of its own overlay style — don't rely on a
caller's reset or a CSS framework's normalize. Suspect this whenever an
absolutely-positioned list overlay measures an unexplained offset (svseeds-ui saw ~16px
in chromium) despite the containing block and anchor math both checking out.

## References

`.ws/decision/019-overlay-anchor-inline-block-wrapper.md`; surfaced independently by both
impl and review during the `ComboBox`/`DateInput` overlay anchoring work.
