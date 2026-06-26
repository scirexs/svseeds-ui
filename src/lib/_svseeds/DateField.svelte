<!--
  @component
  ### Usage
  Use standalone, or wrap `DateInput` to share field state and validation.
  ```svelte
  <DateField {...props} />

  <DateField {...props}>
    <DateInput {...props} />
  </DateField>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface DateFieldProps {
    label?: string;
    extra?: string;
    aux?: Snippet<[Temporal.PlainDate | undefined, string, HTMLInputElement | undefined]>;
    left?: Snippet<[Temporal.PlainDate | undefined, string, HTMLInputElement | undefined]>;
    right?: Snippet<[Temporal.PlainDate | undefined, string, HTMLInputElement | undefined]>;
    bottom?: string;
    reserve?: boolean;
    value?: Temporal.PlainDate;
    min?: Temporal.PlainDate;
    max?: Temporal.PlainDate;
    required?: boolean;
    disabled?: boolean;
    validations?: DateFieldValidation[];
    name?: string;
    native?: boolean;
    element?: HTMLInputElement;
    styling?: SVSClass;
    variant?: SVSVariant;
    dateInput?: Omit<DateInputProps, DateInputReqdProps | DateInputBindProps | "name" | "min" | "max" | "required" | "disabled" | "variant" | "styling">;
    children?: Snippet;
  }
  type DateFieldValidation = SVSFieldValidation<Temporal.PlainDate | undefined>;
  // `dateInput` configures the default `<DateInput/>` only; when `children` is provided the bag is ignored and the child control owns its own props.
  ```
  ### Anatomy
  ```svelte
  <div class="whole" role aria-*>
    <div class="top" conditional: label or aux>
      <label class="label" conditional>
        {label}
        <span class="extra" conditional>{extra}</span>
      </label>
      <span class="aux" conditional>{aux}</span>
    </div>
    <div class="middle">
      <span class="left" conditional>{left}</span>
      {#if children}{@render children()}{:else if native}<input class="main" type="date" aria-* />{:else}<DateInput />{/if}
      <span class="right" conditional>{right}</span>
      <input hidden conditional: non-native field participant />
    </div>
    <div class="bottom" conditional: has text, or always when reserve; role="alert only on error">{bottom}</div>
  </div>
  ```
  ### Behavior
  - In the default path, one hidden attribute input carries the canonical ISO form value and all constraint validation, including when `DateInput` is readonly.
  - `native` uses a browser-provided `<input type="date">`; `dateInput` options do not apply in that mode.
-->
<script module lang="ts">
  export interface DateFieldProps {
    label?: string;
    extra?: string;
    aux?: Snippet<[Temporal.PlainDate | undefined, string, HTMLInputElement | undefined]>;
    left?: Snippet<[Temporal.PlainDate | undefined, string, HTMLInputElement | undefined]>;
    right?: Snippet<[Temporal.PlainDate | undefined, string, HTMLInputElement | undefined]>;
    bottom?: string;
    reserve?: boolean;
    value?: Temporal.PlainDate;
    min?: Temporal.PlainDate;
    max?: Temporal.PlainDate;
    required?: boolean;
    disabled?: boolean;
    validations?: DateFieldValidation[];
    name?: string;
    native?: boolean;
    element?: HTMLInputElement;
    styling?: SVSClass;
    variant?: SVSVariant;
    dateInput?: Omit<
      DateInputProps,
      DateInputReqdProps | DateInputBindProps | "name" | "min" | "max" | "required" | "disabled" | "variant" | "styling"
    >;
    children?: Snippet;
  }
  export type DateFieldReqdProps = never;
  export type DateFieldBindProps = "value" | "variant" | "element";
  export type DateFieldValidation = SVSFieldValidation<Temporal.PlainDate | undefined>;

  export const _DATE_FIELD_PRESET = "svs-date-field";

  import { onMount, untrack } from "svelte";
  import { PARTS, VARIANT, _fnClass, _isNeutral } from "./_core";
  import DateInput, { _DATE_INPUT_PRESET, _setDateInputContext } from "./DateInput.svelte";
  import type { Snippet } from "svelte";
  import type { SVSClass, SVSFieldValidation, SVSVariant } from "./_core";
  import type { DateInputBindProps, DateInputContext, DateInputProps, DateInputReqdProps } from "./DateInput.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, extra, aux, left, right, bottom, reserve = false, value = $bindable(), min, max, required = false, disabled = false, validations = [], name, native = false, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), dateInput, children }: DateFieldProps = $props();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_DATE_FIELD_PRESET, styling));
  const uid = $props.id();
  const id = $derived(label?.trim() ? `${uid}-ctrl` : undefined);
  const idLabel = $derived(label?.trim() ? `${uid}-label` : undefined);
  const idDesc = $derived(bottom?.trim() ? `${uid}-desc` : undefined);
  const idErr = $derived(idDesc ?? `${uid}-err`);
  let errmsg = $state("");
  const message = $derived(variant === VARIANT.INACTIVE ? errmsg || bottom : bottom);
  const idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);
  let proxyEl = $state<HTMLInputElement>();

  // *** Initialize Context *** //
  const ctx: DateInputContext = {
    get value() {
      return value;
    },
    set value(v) {
      value = v;
    },
    get variant() {
      return variant;
    },
    set element(v: HTMLInputElement | undefined) {
      element = v;
    },
    get ariaErrMsgId() {
      return idMsg;
    },
    get styling() {
      return `${_DATE_FIELD_PRESET} ${_DATE_INPUT_PRESET}`;
    },
    get id() {
      return id;
    },
    get describedby() {
      return idDesc;
    },
    onchange,
    oninvalid,
  };
  _setDateInputContext(ctx);

  // *** States *** //
  let neutral = _isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  $effect(() => {
    neutral = _isNeutral(variant) ? variant : neutral;
  });
  const live = $derived(variant === VARIANT.INACTIVE ? "alert" : undefined);
  const validEl = $derived(native ? element : proxyEl);
  function shift(oninvalid?: boolean) {
    const vmsg = validEl?.validationMessage ?? "";
    variant = value === undefined && !oninvalid ? neutral : vmsg ? VARIANT.INACTIVE : VARIANT.ACTIVE;
    errmsg = vmsg;
  }
  function verify() {
    if (!validEl) return;
    for (const v of validations) {
      const msg = v({ value, validity: validEl.validity, element: validEl });
      if (msg) return validEl.setCustomValidity(msg);
    }
    validEl.setCustomValidity("");
  }

  // *** Reactive Handlers *** //
  $effect.pre(() => {
    value;
    untrack(() => validate(true));
  });
  function validate(effect?: boolean) {
    if (effect && _isNeutral(variant)) return;
    verify();
    shift();
  }

  // *** Event Handlers *** //
  function onchange(_ev: Event) {
    validate();
  }
  function oninvalid(ev: Event) {
    ev.preventDefault();
    shift(true);
  }
  function safeFrom(src: string): Temporal.PlainDate | undefined {
    try {
      return Temporal.PlainDate.from(src);
    } catch {
      return undefined;
    }
  }
  function nativeInput(ev: Event) {
    const src = (ev.currentTarget as HTMLInputElement).value;
    value = src ? safeFrom(src) : undefined;
  }
  function nativeChange(ev: Event) {
    nativeInput(ev);
    validate();
  }
  onMount(() => verify());
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, variant)} role="group" aria-labelledby={idLabel}>
  {#if label?.trim() || aux}
    <div class={cls(PARTS.TOP, variant)}>
      {@render lbl()}
      {#if aux}
        <span class={cls(PARTS.AUX, variant)}>{@render aux(value, variant, element)}</span>
      {/if}
    </div>
  {/if}
  <div class={cls(PARTS.MIDDLE, variant)}>
    {@render side(PARTS.LEFT, left)}
    {#if children}
      {@render children()}
    {:else if native}
      {@render nativeControl()}
    {:else}
      {@render dateInputControl()}
    {/if}
    {@render side(PARTS.RIGHT, right)}
    {@render participant()}
  </div>
  {#if reserve || message?.trim()}
    <div class={cls(PARTS.BOTTOM, variant)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
</div>

{#snippet dateInputControl()}
  <DateInput {...dateInput} {min} {max} {disabled} aria-required={required ? "true" : undefined} />
{/snippet}
{#snippet nativeControl()}
  <input
    class={cls(PARTS.MAIN, variant)}
    type="date"
    bind:this={element}
    {name}
    {required}
    {disabled}
    min={min?.toString()}
    max={max?.toString()}
    value={value?.toString() ?? ""}
    {id}
    aria-describedby={idDesc}
    aria-errormessage={idMsg}
    aria-invalid={idMsg ? "true" : undefined}
    oninput={nativeInput}
    onchange={nativeChange}
    {oninvalid}
  />
{/snippet}
{#snippet participant()}
  {#if !native && (name || required || validations?.length)}
    <input hidden bind:this={proxyEl} {name} value={value?.toString() ?? ""} {required} {disabled} {oninvalid} />
  {/if}
{/snippet}
{#snippet lbl()}
  {#if label?.trim()}
    <label class={cls(PARTS.LABEL, variant)} for={id} id={idLabel}>
      {label}
      {#if extra?.trim()}
        <span class={cls(PARTS.EXTRA, variant)}>{extra}</span>
      {/if}
    </label>
  {/if}
{/snippet}
{#snippet side(area: string, body?: Snippet<[Temporal.PlainDate | undefined, string, HTMLInputElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(value, variant, element)}</span>
  {/if}
{/snippet}
