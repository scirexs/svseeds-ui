<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface HotkeyCaptureProps extends Omit<HTMLInputAttributes, "type" | "value" | "readonly" | "onkeydown" | "onpointerdown" | "onwheel" | "oncontextmenu"> {
    value?: string; // bindable
    active?: boolean; // bindable (false)
    disabled?: boolean; //  (false)
    oncapture?: (detail: HotkeyCaptureDetail) => void;
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // class & other input attributes are passed to the input via ...rest (class is merged onto the input)
  }
  interface HotkeyCaptureDetail {
    value: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
    key: string;
    kind: "key" | "pointer" | "wheel";
    event: KeyboardEvent | PointerEvent | WheelEvent;
  }
  ```
  ### Anatomy
  ```svelte
  <input class="main" {...rest} type="text" readonly />
  ```
  ### Exports
  ```ts
  // Parses a space-separated hotkey string (e.g. "Ctrl Shift A") into its modifier flags and trailing key.
  function parseHotkey(value: string): Omit<HotkeyCaptureDetail, "event" | "kind">;
  ```
-->
<script module lang="ts">
  export interface HotkeyCaptureProps extends Omit<
    HTMLInputAttributes,
    "type" | "value" | "readonly" | "onkeydown" | "onpointerdown" | "onwheel" | "oncontextmenu"
  > {
    value?: string; // bindable
    active?: boolean; // bindable (false)
    disabled?: boolean; // (false)
    oncapture?: (detail: HotkeyCaptureDetail) => void;
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
  }
  export type HotkeyCaptureReqdProps = never;
  export type HotkeyCaptureBindProps = "value" | "active" | "variant" | "element";
  export interface HotkeyCaptureDetail {
    value: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
    key: string;
    kind: "key" | "pointer" | "wheel";
    event: KeyboardEvent | PointerEvent | WheelEvent;
  }

  export const _HOTKEY_CAPTURE_PRESET = "svs-hotkey-capture";
  const KEY_MODIFIER = new Set(["Control", "Alt", "Shift", "Meta"]);
  const KEY_UNSTABLE = new Set(["Process", "Dead", "Unidentified"]);
  const LABEL_SPACE = "SPACE";
  const LABEL_POINTER = ["BTN_MAIN", "BTN_WHEEL", "BTN_SUB", "BTN_BACK", "BTN_FORWARD"] as const;
  const LABEL_WHEEL = ["WHEELUP", "WHEELDOWN"] as const;
  function getModifierLabel(ev: KeyboardEvent | PointerEvent | WheelEvent): string {
    return `${ev.ctrlKey ? "Ctrl " : ""}${ev.altKey ? "Alt " : ""}${ev.shiftKey ? "Shift " : ""}${ev.metaKey ? "Meta " : ""}`;
  }
  export function parseHotkey(value: string): Omit<HotkeyCaptureDetail, "event" | "kind"> {
    const t = value.split(" ").filter(Boolean);
    const key = t.pop() ?? "";
    const has = (m: string) => t.includes(m);
    return { value, ctrl: has("Ctrl"), alt: has("Alt"), shift: has("Shift"), meta: has("Meta"), key };
  }

  import { untrack } from "svelte";
  import { VARIANT, PARTS, fnClass, isNeutral } from "./core";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLInputAttributes, FocusEventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { value = $bindable(""), active = $bindable(false), disabled = false, oncapture, attach, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), class: c, onfocus, onblur, ...rest }: HotkeyCaptureProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(_HOTKEY_CAPTURE_PRESET, styling));
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;

  // *** Reactive Handlers *** //
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  $effect.pre(() => {
    active;
    disabled;
    untrack(() => shiftStatus());
  });
  $effect(() => {
    active;
    disabled;
    element;
    untrack(() => toggleFocus());
  });
  function toggleFocus() {
    if (disabled) return;
    if (active) {
      if (document.activeElement !== element) element?.focus();
    } else if (document.activeElement === element) {
      element?.blur();
    }
  }
  function shiftStatus() {
    if (disabled) return (variant = VARIANT.INACTIVE);
    variant = active ? VARIANT.ACTIVE : neutral;
  }

  // *** Event Handlers *** //
  const ignore = () => disabled || document.activeElement !== element;
  function prep(ev: KeyboardEvent | PointerEvent | MouseEvent | WheelEvent) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  function capture(key: string, kind: HotkeyCaptureDetail["kind"], ev: KeyboardEvent | PointerEvent | WheelEvent) {
    value = getModifierLabel(ev) + key;
    oncapture?.({ value, ctrl: ev.ctrlKey, alt: ev.altKey, shift: ev.shiftKey, meta: ev.metaKey, key, kind, event: ev });
  }
  const hkeydown = (ev: KeyboardEvent) => {
    if (ev.repeat || ignore()) return;
    prep(ev);
    if (ev.isComposing || KEY_UNSTABLE.has(ev.key)) return;
    if (KEY_MODIFIER.has(ev.key)) return;
    capture(ev.key === " " ? LABEL_SPACE : ev.key.toUpperCase(), "key", ev);
  };
  const hpointerdown = (ev: PointerEvent) => {
    if (ignore()) return;
    prep(ev);
    const label = LABEL_POINTER[ev.button];
    if (label === undefined) return;
    capture(label, "pointer", ev);
  };
  const hwheel = (ev: WheelEvent) => {
    if (ignore() || ev.deltaY === 0) return;
    prep(ev);
    capture(LABEL_WHEEL[ev.deltaY < 0 ? 0 : 1], "wheel", ev);
  };
  const hcontextmenu = (ev: MouseEvent) => {
    if (ignore()) return;
    prep(ev);
  };
  const hfocus: FocusEventHandler<HTMLInputElement> = (ev: FocusEvent) => {
    active = true;
    onfocus?.(ev as any);
  };
  const hblur: FocusEventHandler<HTMLInputElement> = (ev: FocusEvent) => {
    active = false;
    onblur?.(ev as any);
  };
</script>

<!---------------------------------------->

<input
  bind:value
  bind:this={element}
  class={[cls(PARTS.MAIN, variant), c]}
  {...rest}
  type="text"
  readonly={true}
  {disabled}
  onkeydown={hkeydown}
  onpointerdown={hpointerdown}
  onwheel={hwheel}
  oncontextmenu={hcontextmenu}
  onfocus={hfocus}
  onblur={hblur}
  {@attach attach}
/>
