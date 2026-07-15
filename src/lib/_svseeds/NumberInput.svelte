<!--
  @component
  ### Usage
  Use standalone, or inside `NumberField`.
  ```svelte
  <NumberInput {...props} />
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface NumberInputProps extends Omit<HTMLInputAttributes, "type" | "value" | "min" | "max" | "step" | "pattern" | "list"> {
    value?: number; // bindable; undefined = empty
    min?: number;
    max?: number;
    step?: number; // (1)
    any?: boolean; // (false)
    spin?: "none" | "split" | "stack"; // ("none")
    left?: Snippet<[string]>; // Snippet<[variant]>
    right?: Snippet<[string]>; // Snippet<[variant]>
    options?: SvelteSet<number> | Set<number>;
    ariaDecLabel?: string; // ("Decrement")
    ariaIncLabel?: string; // ("Increment")
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // class & other HTMLInputAttributes are passed to <input> via ...rest (class is merged onto the control)
  }
  ```
  ### Anatomy
  ```svelte
  <span class="whole">
    <button class="left" type="button" conditional: spin === "split">{left}</button>
    <input class="main" type="text" inputmode="decimal" />
    <span class="aux" conditional: spin === "stack">
      <button class="right" type="button">{right}</button>
      <button class="left" type="button">{left}</button>
    </span>
    <button class="right" type="button" conditional: spin === "split">{right}</button>
    <datalist conditional>
      {#each options as option}
        <option value={option}></option>
      {/each}
    </datalist>
  </span>
  ```
-->
<script module lang="ts">
  export interface NumberInputProps extends Omit<HTMLInputAttributes, "type" | "value" | "min" | "max" | "step" | "pattern" | "list"> {
    value?: number; // bindable; undefined = empty
    min?: number;
    max?: number;
    step?: number; // (1)
    any?: boolean; // (false)
    spin?: "none" | "split" | "stack"; // ("none")
    left?: Snippet<[string]>; // Snippet<[variant]>
    right?: Snippet<[string]>; // Snippet<[variant]>
    options?: SvelteSet<number> | Set<number>;
    ariaDecLabel?: string; // ("Decrement")
    ariaIncLabel?: string; // ("Increment")
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type NumberInputReqdProps = never;
  export type NumberInputBindProps = "value" | "element";

  export const _NUMBER_INPUT_PRESET = "svs-number-input";

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

  import { onDestroy, untrack } from "svelte";
  import { VARIANT, PARTS, _fnClass, _createContext, _SVG_ATTR } from "./_core";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { SvelteSet } from "svelte/reactivity";
  import type { HTMLInputAttributes, KeyboardEventHandler, FormEventHandler, EventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant, SVSContext } from "./_core";
</script>

<script lang="ts">
  // prettier-ignore
  let { value = $bindable(), min, max, step = 1, any = false, inputmode = "decimal", spin = "none", options, ariaDecLabel = "Decrement", ariaIncLabel = "Increment", left, right, onchange: onchangeProp, oninvalid: oninvalidProp, onkeydown, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, id: idProp, "aria-describedby": ariaDescribedbyProp, class: c, "aria-invalid": ariaInvalid, ...rest }: NumberInputProps = $props();
  const ctx = _getNumberInputContext();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_NUMBER_INPUT_PRESET, styling ?? ctx?.styling));
  const uid = $props.id();
  const idList = $derived(options?.size ? `${uid}-list` : undefined);
  const effVariant = $derived(ctx ? ctx.variant : variant);
  const effValue = $derived(ctx ? ctx.value : value);
  const effAriaErrMsgId = $derived(ctx ? ctx.ariaErrMsgId : undefined);
  const effId = $derived(ctx ? ctx.id : idProp);
  const effDescribedby = $derived(ctx ? ctx.describedby : ariaDescribedbyProp);
  const allowNeg = $derived(min === undefined || min < 0);
  const disabled = $derived(Boolean(rest.disabled));
  const decDisabled = $derived(disabled || (min !== undefined && (effValue ?? min) <= min));
  const incDisabled = $derived(disabled || (max !== undefined && (effValue ?? min ?? 0) >= alignedMax()));

  function format(v?: number): string {
    return v === undefined ? "" : String(v);
  }
  function setValue(v?: number) {
    if (ctx) ctx.value = v;
    else value = v;
  }
  function emitChange() {
    const ev = new Event("change");
    onchangeProp?.(ev as any);
    ctx?.onchange?.(ev);
  }
  $effect(() => {
    if (ctx) ctx.element = element;
  });

  // *** States *** //
  // svelte-ignore state_referenced_locally
  let text = $state(format(effValue));
  // svelte-ignore state_referenced_locally
  let last = $state(format(effValue));
  let focused = $state(false);
  let wait: ReturnType<typeof setTimeout> | undefined = undefined;
  let repeat: ReturnType<typeof setInterval> | undefined = undefined;

  // *** Reactive Handlers *** //
  $effect.pre(() => {
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
  const hbeforeinput: EventHandler<InputEvent, HTMLInputElement> = (ev) => {
    if (!ev.inputType.startsWith("insert")) return;
    const input = ev.currentTarget;
    const ins = ev.data ?? "";
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const next = `${input.value.slice(0, start)}${ins}${input.value.slice(end)}`;
    if (!legal(next)) ev.preventDefault();
  };
  const hinput: FormEventHandler<HTMLInputElement> = (ev) => {
    const input = ev.currentTarget;
    if (!legal(input.value)) {
      input.value = last;
      text = last;
    } else {
      text = input.value;
      last = text;
    }
    setValue(parse(text));
  };
  const hchange: FormEventHandler<HTMLInputElement> = (ev) => {
    commit(ev.currentTarget.value);
    onchangeProp?.(ev as any);
    ctx?.onchange?.(ev);
  };
  const hblur: FormEventHandler<HTMLInputElement> = (ev) => {
    commit(ev.currentTarget.value);
    focused = false;
  };
  const hfocus = () => {
    focused = true;
  };
  const hinvalid: FormEventHandler<HTMLInputElement> = (ev) => {
    oninvalidProp?.(ev);
    ctx?.oninvalid?.(ev);
  };
  const hkeydown: KeyboardEventHandler<HTMLInputElement> = (ev) => {
    onkeydown?.(ev);
    if (spin === "none" || ev.isComposing) return;
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
      repeat = setInterval(() => {
        if (dir > 0 ? incDisabled : decDisabled) return stop();
        bump(dir);
      }, 60);
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
    if (element) element.value = text;
    setValue(v);
    emitChange();
  }
  function bumpValue(dir: 1 | -1): number {
    const base = effValue ?? min ?? 0;
    if (any) {
      const u = unit();
      const d = Math.max(decimals(base), decimals(u));
      return clampSnap(Number((base + dir * u).toFixed(d)));
    }
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
    const dec = "(\\.\\d*)?";
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
  function unit(): number {
    return Number.isFinite(step) && step > 0 ? step : 1;
  }
  function alignedMax(): number {
    if (max === undefined) return Infinity;
    if (any) return max;
    const u = unit();
    const base = min ?? 0;
    const d = Math.max(decimals(base), decimals(u));
    const steps = Math.floor((max - base) / u + 1e-9);
    return Number((base + steps * u).toFixed(d));
  }
  function clampSnap(n: number): number {
    const lo = min ?? -Infinity;
    const hi = alignedMax();
    if (any) return Math.min(hi, Math.max(lo, n));
    const u = unit();
    const base = min ?? 0;
    const d = Math.max(decimals(base), decimals(u));
    const v = Number((base + Math.round((n - base) / u) * u).toFixed(d));
    return Math.min(hi, Math.max(lo, v));
  }
  onDestroy(stop);
</script>

<!---------------------------------------->

<span class={cls(PARTS.WHOLE, effVariant)}>
  {#if spin === "split"}
    {@render decBtn()}
  {/if}
  <input
    value={text}
    bind:this={element}
    class={[cls(PARTS.MAIN, effVariant), c]}
    {...rest}
    type="text"
    id={effId}
    list={idList}
    {inputmode}
    role={spin !== "none" ? "spinbutton" : undefined}
    aria-valuenow={spin !== "none" ? effValue : undefined}
    aria-valuemin={spin !== "none" ? min : undefined}
    aria-valuemax={spin !== "none" && max !== undefined ? alignedMax() : undefined}
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
  {#if spin === "stack"}
    <span class={cls(PARTS.AUX, effVariant)}>
      {@render incBtn()}
      {@render decBtn()}
    </span>
  {:else if spin === "split"}
    {@render incBtn()}
  {/if}
  {#if options?.size}
    <datalist id={idList}>
      {#each options as option (option)}
        <option value={option}></option>
      {/each}
    </datalist>
  {/if}
</span>

{#snippet decBtn()}
  <button
    class={cls(PARTS.LEFT, effVariant)}
    type="button"
    tabindex="-1"
    aria-label={ariaDecLabel}
    disabled={decDisabled}
    onpointerdown={hdown(-1)}
    onpointerup={hup}
    onpointerleave={hup}
    onpointercancel={hup}
  >
    {#if left}
      {@render left(effVariant)}
    {:else}
      <svg {..._SVG_ATTR}>
        <path d="M0 7h16v2H0z" />
      </svg>
    {/if}
  </button>
{/snippet}
{#snippet incBtn()}
  <button
    class={cls(PARTS.RIGHT, effVariant)}
    type="button"
    tabindex="-1"
    aria-label={ariaIncLabel}
    disabled={incDisabled}
    onpointerdown={hdown(1)}
    onpointerup={hup}
    onpointerleave={hup}
    onpointercancel={hup}
  >
    {#if right}
      {@render right(effVariant)}
    {:else}
      <svg {..._SVG_ATTR}>
        <path d="M7 0h2v16H7z" />
        <path d="M0 7h16v2H0z" />
      </svg>
    {/if}
  </button>
{/snippet}
