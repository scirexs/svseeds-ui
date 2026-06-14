<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface NumberInputProps extends Omit<HTMLInputAttributes, "type" | "value" | "min" | "max" | "step" | "inputmode" | "pattern" | "list"> {
    value?: number; // bindable; undefined = empty
    min?: number;
    max?: number;
    step?: number; // (1)
    integer?: boolean; // (false)
    spin?: boolean; // (false)
    options?: SvelteSet<number> | Set<number>;
    decrementLabel?: string; // ("Decrement")
    incrementLabel?: string; // ("Increment")
    decrement?: Snippet<[string]>; // Snippet<[variant]>
    increment?: Snippet<[string]>; // Snippet<[variant]>
    attach?: Attachment;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // class & other HTMLInputAttributes are passed to <input> via ...rest (class is merged onto the control)
  }
  ```
  ### Anatomy
  ```svelte
  <div class="whole">
    <button class="left" type="button" conditional: spin>
      <span class="extra">decrement</span>
    </button>
    <input class="main" type="text" inputmode="numeric|decimal" />
    <button class="right" type="button" conditional: spin>
      <span class="extra">increment</span>
    </button>
    <datalist conditional>
      {#each options as option}
        <option value={option}></option>
      {/each}
    </datalist>
  </div>
  ```
-->
<script module lang="ts">
  export interface NumberInputProps extends Omit<
    HTMLInputAttributes,
    "type" | "value" | "min" | "max" | "step" | "inputmode" | "pattern" | "list"
  > {
    value?: number; // bindable; undefined = empty
    min?: number;
    max?: number;
    step?: number; // (1)
    integer?: boolean; // (false)
    spin?: boolean; // (false)
    options?: SvelteSet<number> | Set<number>;
    decrementLabel?: string; // ("Decrement")
    incrementLabel?: string; // ("Increment")
    decrement?: Snippet<[string]>; // Snippet<[variant]>
    increment?: Snippet<[string]>; // Snippet<[variant]>
    attach?: Attachment;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type NumberInputReqdProps = never;
  export type NumberInputBindProps = "value" | "element";

  export const _NUMBER_INPUT_PRESET = "svs-number-input";
  const preset = _NUMBER_INPUT_PRESET;

  export interface NumberInputContext extends SVSContext {
    get value(): number | undefined;
    set value(v: number | undefined);
    set element(v: HTMLInputElement | undefined);
    get ariaErrMsgId(): string | undefined;
    get id(): string | undefined;
    get describedby(): string | undefined;
    onchange?: (ev: Event) => void;
    oninvalid?: (ev: Event) => void;
  }
  export const [_getNumberInputContext, _setNumberInputContext] = _createContext<NumberInputContext>();

  import { type Snippet, untrack } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type SvelteSet } from "svelte/reactivity";
  import { type HTMLInputAttributes, type KeyboardEventHandler } from "svelte/elements";
  import { type SVSClass, type SVSVariant, type SVSContext, VARIANT, PARTS, fnClass, _createContext } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { value = $bindable(), min, max, step = 1, integer = false, spin = false, options, decrementLabel = "Decrement", incrementLabel = "Increment", decrement, increment, onchange: onchangeProp, oninvalid: oninvalidProp, onkeydown, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, id: idProp, "aria-describedby": ariaDescribedbyProp, class: c, "aria-invalid": ariaInvalid, ...rest }: NumberInputProps = $props();
  const ctx = _getNumberInputContext();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling ?? ctx?.styling));
  const uid = $props.id();
  const idList = $derived(options?.size ? `${uid}-list` : undefined);
  const effVariant = $derived(ctx ? ctx.variant : variant);
  const effValue = $derived(ctx ? ctx.value : value);
  const effAriaErrMsgId = $derived(ctx ? ctx.ariaErrMsgId : undefined);
  const effId = $derived(ctx ? ctx.id : idProp);
  const effDescribedby = $derived(ctx ? ctx.describedby : ariaDescribedbyProp);
  const allowNeg = $derived(min === undefined || min < 0);
  const mode = $derived(integer ? "numeric" : "decimal");
  const disabled = $derived(Boolean(rest.disabled));
  const now = $derived(effValue === undefined ? undefined : effValue);
  const decDisabled = $derived(disabled || (min !== undefined && (effValue ?? min) <= min));
  const incDisabled = $derived(disabled || (max !== undefined && (effValue ?? min ?? 0) >= max));

  function format(v?: number): string {
    return v === undefined ? "" : String(v);
  }
  function setValue(v?: number) {
    if (ctx) ctx.value = v;
    else value = v;
  }
  $effect(() => {
    if (ctx) ctx.element = element;
  });

  // *** States *** //
  let text = $state(untrack(() => format(effValue)));
  let last = $state(untrack(() => format(effValue)));
  let focused = $state(false);
  let wait: ReturnType<typeof setTimeout> | undefined = undefined;
  let repeat: ReturnType<typeof setInterval> | undefined = undefined;

  // *** Reactive Handlers *** //
  $effect(() => {
    effValue;
    focused;
    element;
    untrack(() => {
      if (!focused && !active()) sync();
    });
  });
  function active(): boolean {
    return typeof document !== "undefined" && element === document.activeElement;
  }
  function sync() {
    text = format(effValue);
    last = text;
  }

  // *** Event Handlers *** //
  const hbeforeinput = (ev: InputEvent) => {
    if (!ev.inputType.startsWith("insert")) return;
    const input = ev.currentTarget as HTMLInputElement;
    const ins = ev.data ?? "";
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const next = `${input.value.slice(0, start)}${ins}${input.value.slice(end)}`;
    if (!legal(next)) ev.preventDefault();
  };
  const hinput = (ev: Event) => {
    const input = ev.currentTarget as HTMLInputElement;
    if (!legal(input.value)) {
      input.value = last;
      text = last;
    } else {
      text = input.value;
      last = text;
    }
    setValue(parse(text));
  };
  const hchange = (ev: Event) => {
    commit((ev.currentTarget as HTMLInputElement).value);
    onchangeProp?.(ev as any);
    ctx?.onchange?.(ev);
  };
  const hblur = (ev: FocusEvent) => {
    commit((ev.currentTarget as HTMLInputElement).value);
    focused = false;
  };
  const hfocus = () => {
    focused = true;
  };
  const hinvalid = (ev: Event) => {
    oninvalidProp?.(ev as any);
    ctx?.oninvalid?.(ev);
  };
  const hkeydown: KeyboardEventHandler<HTMLInputElement> = (ev) => {
    onkeydown?.(ev);
    if (!spin || ev.isComposing) return;
    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      bump(1);
    }
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      bump(-1);
    }
  };
  const hdown = (dir: 1 | -1) => () => {
    bump(dir);
    stop();
    wait = setTimeout(() => {
      repeat = setInterval(() => bump(dir), 60);
    }, 300);
  };
  const hup = () => stop();

  function commit(src = text) {
    const v = parse(src);
    if (v === undefined) {
      if (src !== "") {
        text = "";
        last = "";
        setValue(undefined);
      }
      return;
    }
    const c = clampSnap(v);
    text = format(c);
    last = text;
    setValue(c);
  }
  function bump(dir: 1 | -1) {
    const v = bumpValue(dir);
    text = format(v);
    last = text;
    setValue(v);
  }
  function bumpValue(dir: 1 | -1): number {
    const base = effValue ?? min ?? 0;
    return clampSnap(base + dir * unit());
  }
  function stop() {
    if (wait) clearTimeout(wait);
    if (repeat) clearInterval(repeat);
    wait = undefined;
    repeat = undefined;
  }
  function legal(v: string): boolean {
    const neg = allowNeg ? "-?" : "";
    const dec = integer ? "" : "(\\.\\d*)?";
    return new RegExp(`^${neg}\\d*${dec}$`).test(v);
  }
  function parse(v: string): number | undefined {
    const t = v.trim();
    if (!t || t === "-" || t === "." || t === "-." || t.endsWith(".")) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }
  function decimals(v: number): number {
    const s = String(v);
    if (!s.includes("e")) return s.split(".")[1]?.length ?? 0;
    const [, exp = "0"] = s.split("e-");
    return Number(exp) || 0;
  }
  function roundTo(n: number, d: number): number {
    return Number(n.toFixed(d));
  }
  function unit(): number {
    return Number.isFinite(step) && step > 0 ? step : 1;
  }
  function clampSnap(n: number): number {
    const u = unit();
    const d = decimals(u);
    const base = min ?? 0;
    const lo = min ?? -Infinity;
    const hi = max ?? Infinity;
    let v = base + roundTo(Math.round((n - base) / u) * u, d);
    if (integer) v = Math.round(v);
    return Math.min(hi, Math.max(lo, v));
  }
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, effVariant)}>
  {#if spin}
    <button
      class={cls(PARTS.LEFT, effVariant)}
      type="button"
      tabindex="-1"
      aria-label={decrementLabel}
      disabled={decDisabled}
      onpointerdown={hdown(-1)}
      onpointerup={hup}
      onpointerleave={hup}
      onpointercancel={hup}
    >
      <span class={cls(PARTS.EXTRA, effVariant)}>
        {#if decrement}
          {@render decrement(effVariant)}
        {:else}
          <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="10" height="10">
            <path d="M0 7h16v2H0z" />
          </svg>
        {/if}
      </span>
    </button>
  {/if}
  <input
    value={text}
    bind:this={element}
    class={[cls(PARTS.MAIN, effVariant), c]}
    {...rest}
    type="text"
    id={effId}
    list={idList}
    inputmode={mode}
    role={spin ? "spinbutton" : undefined}
    aria-valuenow={spin ? now : undefined}
    aria-valuemin={spin ? min : undefined}
    aria-valuemax={spin ? max : undefined}
    onbeforeinput={hbeforeinput}
    oninput={hinput}
    onkeydown={hkeydown}
    onchange={hchange}
    onfocus={hfocus}
    onblur={hblur}
    oninvalid={hinvalid}
    aria-describedby={effDescribedby}
    aria-invalid={ariaInvalid ?? (effAriaErrMsgId ? true : undefined)}
    aria-errormessage={effAriaErrMsgId}
    {@attach attach}
  />
  {#if spin}
    <button
      class={cls(PARTS.RIGHT, effVariant)}
      type="button"
      tabindex="-1"
      aria-label={incrementLabel}
      disabled={incDisabled}
      onpointerdown={hdown(1)}
      onpointerup={hup}
      onpointerleave={hup}
      onpointercancel={hup}
    >
      <span class={cls(PARTS.EXTRA, effVariant)}>
        {#if increment}
          {@render increment(effVariant)}
        {:else}
          <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="10" height="10">
            <path d="M7 0h2v16H7z" />
            <path d="M0 7h16v2H0z" />
          </svg>
        {/if}
      </span>
    </button>
  {/if}
  {#if options?.size}
    <datalist id={idList}>
      {#each options as option (option)}
        <option value={option}></option>
      {/each}
    </datalist>
  {/if}
</div>
