<!--
  @component
  ### Usage
  Use standalone.
  ```svelte
  <SelectField {...props} />
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface SelectFieldProps extends Omit<HTMLSelectAttributes, "value" | "multiple"> {
    options: SvelteMap<string, string> | Map<string, string>;
    placeholder?: string; // text of the auto-injected empty option
    label?: string;
    extra?: string;
    aux?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[value,variant,element]>
    bottom?: string;
    reserve?: boolean; // (false)
    value?: string; // bindable
    validations?: SelectFieldValidation[];
    attach?: Attachment<HTMLSelectElement>;
    element?: HTMLSelectElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // class & other HTMLSelectAttributes are passed to <select> via ...rest (class is merged onto the control)
    // single-select only; multiple is intentionally unsupported
  }
  type SelectFieldValidation = SVSFieldValidation<string, HTMLSelectElement>;
  ```
  ### Anatomy
  An empty `<option value="">` is auto-injected at the top when `options` has no `""` key
  and (`placeholder` is set OR `value === ""`).
  ```svelte
  <div class="whole">
    <div class="top" conditional: label or aux>
      <label class="label" conditional>
        {label}
        <span class="extra" conditional>{extra}</span>
      </label>
      <span class="aux" conditional>{aux}</span>
    </div>
    <div class="middle">
      <span class="left" conditional>{left}</span>
      <select class="main" {...rest}>
        <option value="" conditional>{placeholder}</option>
        {#each options as { option, text }}
          <option value={option}>{text}</option>
        {/each}
      </select>
      <span class="right" conditional>{right}</span>
    </div>
    <div class="bottom" conditional: has text, or always when reserve>{bottom}</div>
  </div>
  ```
-->
<script module lang="ts">
  export interface SelectFieldProps extends Omit<HTMLSelectAttributes, "value" | "multiple"> {
    options: SvelteMap<string, string> | Map<string, string>;
    placeholder?: string; // text of the auto-injected empty option
    label?: string;
    extra?: string;
    aux?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[string, string, HTMLSelectElement | undefined]>; // Snippet<[value,variant,element]>
    bottom?: string;
    reserve?: boolean; // (false)
    value?: string; // bindable
    validations?: SelectFieldValidation[];
    attach?: Attachment<HTMLSelectElement>;
    element?: HTMLSelectElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
  }
  export type SelectFieldReqdProps = "options";
  export type SelectFieldBindProps = "value" | "variant" | "element";
  export type SelectFieldValidation = SVSFieldValidation<string, HTMLSelectElement>;

  export const _SELECT_FIELD_PRESET = "svs-select-field";

  import { untrack, onMount } from "svelte";
  import { VARIANT, PARTS, fnClass, isNeutral } from "./_core";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { SvelteMap } from "svelte/reactivity";
  import type { HTMLSelectAttributes, ChangeEventHandler, EventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant, SVSFieldValidation } from "./_core";
</script>

<script lang="ts">
  // prettier-ignore
  let { options, placeholder, label, extra, aux, left, right, bottom, reserve = false, value = $bindable(""), validations = [], id, onchange, oninvalid, attach, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), class: c, ...rest }: SelectFieldProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(_SELECT_FIELD_PRESET, styling));
  const uid = $props.id();
  const idMain = $derived(id ? id : label?.trim() ? `${uid}-ctrl` : undefined);
  const idLabel = $derived(label?.trim() ? `${uid}-label` : undefined);
  const idDesc = $derived(bottom?.trim() ? `${uid}-desc` : undefined);
  const idErr = $derived(idDesc ?? `${uid}-err`);
  let errmsg = $state("");
  const message = $derived(variant === VARIANT.INACTIVE ? errmsg || bottom : bottom);

  // *** States *** //
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  const live = $derived(variant === VARIANT.INACTIVE ? "alert" : undefined);
  const invalid = $derived(variant === VARIANT.INACTIVE ? true : undefined);
  const idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid?: boolean) {
    const vmsg = element?.validationMessage ?? "";
    variant = !value && !oninvalid ? neutral : vmsg ? VARIANT.INACTIVE : VARIANT.ACTIVE;
    errmsg = vmsg;
  }
  function verify() {
    if (!element) return;
    for (const v of validations) {
      const msg = v({ value, validity: element.validity, element });
      if (msg) return element.setCustomValidity(msg);
    }
    element.setCustomValidity("");
  }

  // *** Reactive Handlers *** //
  const showPlaceholder = $derived(!options.has("") && (placeholder !== undefined || value === ""));
  const opts = $derived([
    ...(showPlaceholder ? [{ val: "", text: placeholder ?? "", selected: value === "" }] : []),
    ...Array.from(options, ([val, text]) => ({ val, text, selected: val === value })),
  ]);
  $effect.pre(() => {
    value;
    untrack(() => validate(true));
  });
  function validate(effect?: boolean) {
    if (effect && isNeutral(variant)) return;
    verify();
    shift();
  }

  /*** Handle events ***/
  const hchange: ChangeEventHandler<HTMLSelectElement> = (ev) => {
    onchange?.(ev);
    validate();
  };
  const hinvalid: EventHandler<Event, HTMLSelectElement> = (ev) => {
    oninvalid?.(ev);
    ev.preventDefault();
    shift(true);
  };
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
    {@render main()}
    {@render side(PARTS.RIGHT, right)}
  </div>
  {#if reserve || message?.trim()}
    <div class={cls(PARTS.BOTTOM, variant)} id={idErr} role={live}>{message}</div>
  {/if}
</div>

{#snippet lbl()}
  {#if label?.trim()}
    <label class={cls(PARTS.LABEL, variant)} for={idMain} id={idLabel}>
      {label}
      {#if extra?.trim()}
        <span class={cls(PARTS.EXTRA, variant)}>{extra}</span>
      {/if}
    </label>
  {/if}
{/snippet}
{#snippet side(area: string, body?: Snippet<[string, string, HTMLSelectElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(value, variant, element)}</span>
  {/if}
{/snippet}
{#snippet main()}
  <select
    bind:value
    bind:this={element}
    class={[cls(PARTS.MAIN, variant), c]}
    {...rest}
    id={idMain}
    onchange={hchange}
    oninvalid={hinvalid}
    aria-describedby={idDesc}
    aria-invalid={invalid}
    aria-errormessage={idMsg}
    {@attach attach}
  >
    {@render option()}
  </select>
{/snippet}
{#snippet option()}
  {#each opts as { val, text, selected } (val)}
    <option value={val} {selected}>{text}</option>
  {/each}
{/snippet}
