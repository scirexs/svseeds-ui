<!--
  @component
  default value: `<value>`
  ```ts
  interface HotkeyCaptureProps {
    value?: string; // bindable
    placeholder?: string;
    active?: boolean; // bindable, <false>
    disabled?: boolean; // bindable, <false>
    status?: string; // bindable <STATE.NEUTRAL>
    style?: SVSStyle;
    element?: HTMLInputElement; // bindable
  }
  ```
-->
<script module lang="ts">
  export interface HotkeyCaptureProps {
    value?: string; // bindable
    placeholder?: string;
    active?: boolean; // bindable, <false>
    disabled?: boolean; // bindable, <false>
    status?: string; // bindable <STATE.NEUTRAL>
    style?: SVSStyle;
    element?: HTMLInputElement; // bindable
  }
  export type HotkeyCaptureReqdProps = never;
  export type HotkeyCaptureBindProps = "value" | "active" | "disable" | "status" | "element";

  const preset = "svs-hotkey-capture";
  const KEY_MODIFIER = new Set(["Control", "Alt", "Shift", "Meta"]);
  const LABEL_SPACE = "SPACE";
  const LABEL_POINTER = ["BTN_MAIN","BTN_WHEEL","BTN_SUB","BTN_BACK","BTN_FORWARD"] as const;
  const LABEL_WHEEL = ["WHEELUP", "WHEELDOWN"] as const;
  function getModifierLabel(ev: KeyboardEvent | PointerEvent | WheelEvent): string {
    return `${ev.ctrlKey ? "Ctrl " : ""}${ev.altKey ? "Alt " : ""}${ev.shiftKey ? "Shift " : ""}${ev.metaKey ? "Meta " : ""}`;
  }

  import { untrack } from "svelte";
  import { type SVSStyle, STATE, PARTS, fnClass, isNeutral } from "./core";
</script>

<script lang="ts">
  let { value = $bindable(""), placeholder, active = $bindable(false), disabled = $bindable(false), status = $bindable(""), style, element = $bindable() }: HotkeyCaptureProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.NEUTRAL;
  const cls = fnClass(preset, style);
  let neutral = isNeutral(status) ? status : STATE.NEUTRAL;

  // *** Bind Handlers *** //
  $effect(() => { neutral = isNeutral(status) ? status : neutral });
  $effect.pre(() => {
    disabled;
    untrack(() => shiftStatus());
  });
  $effect.pre(() => {
    active;
    untrack(() => toggle());
  });
  function toggle() {
    if (disabled) return;
    shiftStatus();
    if (active) {
      element?.focus();
    } else {
      element?.blur();
    }
  }
  function shiftStatus() {
    if (disabled) return status = STATE.INACTIVE;
    status = active ? STATE.ACTIVE : neutral;
  }

  // *** Event Handlers *** //
  const ignore = () => disabled || window?.document.activeElement !== element;
  function prep(ev: KeyboardEvent | PointerEvent | MouseEvent | WheelEvent) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  function onkeydown(ev: KeyboardEvent) {
    if (ev.repeat) return;
    if (ignore()) return;
    prep(ev);
    if (KEY_MODIFIER.has(ev.key)) return;
    value = getModifierLabel(ev) + (ev.key === " " ? LABEL_SPACE : ev.key.toUpperCase());
  }
  function onpointerdown(ev: PointerEvent) {
    if (ignore()) return;
    prep(ev);
    value = getModifierLabel(ev) + LABEL_POINTER[ev.button];
  }
  function onwheel(ev: WheelEvent) {
    if (ignore()) return;
    prep(ev);
    value = getModifierLabel(ev) + LABEL_WHEEL[ev.deltaY < 0 ? 0 : 1];
  }
  function oncontextmenu(ev: MouseEvent) { prep(ev); }
  function onfocus() {
    active = true;
  }
  function onblur() {
    active = false;
  }
</script>

<!---------------------------------------->

<input bind:value bind:this={element} class={cls(PARTS.MAIN, status)} type="text" readonly={true} {placeholder} {disabled} {onkeydown} {onpointerdown} {onwheel} {oncontextmenu} {onfocus} {onblur} />
