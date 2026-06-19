<!--
  @component
  ### Usage
  Use standalone.
  ```svelte
  <CheckField {...props} />
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface CheckFieldProps extends Omit<HTMLInputAttributes, "type" | "value" | "id"> {
    options: SvelteMap<string, string> | Map<string, string>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string, HTMLInputElement[]]>; // Snippet<[values,variant,elements]>
    bottom?: string;
    reserve?: boolean; // (false)
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    validations?: CheckFieldValidation[];
    constraints?: CheckFieldConstraint[];
    attach?: Attachment<HTMLInputElement>;
    elements?: HTMLInputElement[]; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // class & other HTMLInputAttributes are passed to each <input> via ...rest (class is merged onto each input; required is applied dynamically)
  }
  type CheckFieldValidation = SVSFieldValidation<string[]>;
  type CheckFieldConstraint = SVSFieldConstraint;
  ```
  ### Anatomy
  ```svelte
  <div class="whole">
    <div class="top" conditional: label or aux>
      <span class="label" conditional>
        {label}
        <span class="extra" conditional>{extra}</span>
      </span>
      <span class="aux" conditional>{aux}</span>
    </div>
    <div class="middle">
      {#each options as { value, text }, i}
        <label class="main">
          <input class="left" {...rest} />
          <span class="right">{text}</span>
        </label>
      {/each}
    </div>
    <div class="bottom" conditional: has text, or always when reserve>{bottom}</div>
  </div>
  ```
-->
<script module lang="ts">
  export interface CheckFieldProps extends Omit<HTMLInputAttributes, "type" | "value" | "id"> {
    options: SvelteMap<string, string> | Map<string, string>;
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string, HTMLInputElement[]]>; // Snippet<[values,variant,elements]>
    bottom?: string;
    reserve?: boolean; // (false)
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    validations?: CheckFieldValidation[];
    constraints?: CheckFieldConstraint[];
    attach?: Attachment<HTMLInputElement>;
    elements?: HTMLInputElement[]; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
  }
  export type CheckFieldReqdProps = "options";
  export type CheckFieldBindProps = "values" | "variant" | "elements";
  export type CheckFieldValidation = SVSFieldValidation<string[]>;
  export type CheckFieldConstraint = SVSFieldConstraint;

  export const _CHECK_FIELD_PRESET = "svs-check-field";

  import { untrack, onMount } from "svelte";
  import { VARIANT, PARTS, fnClass, isNeutral } from "./_core";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { SvelteMap } from "svelte/reactivity";
  import type { HTMLInputAttributes, ChangeEventHandler, EventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant, SVSFieldValidation, SVSFieldConstraint } from "./_core";
</script>

<script lang="ts">
  // prettier-ignore
  let { options, label, extra, aux, bottom, reserve = false, values = $bindable([]), multiple = true, validations = [], constraints = [], name, onchange, oninvalid, attach, elements = $bindable([]), styling, variant = $bindable(VARIANT.NEUTRAL), class: c, required = false, ...rest }: CheckFieldProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(_CHECK_FIELD_PRESET, styling));
  const type = $derived(multiple ? "checkbox" : "radio");
  const uid = $props.id();
  const nm = $derived(name?.trim() ? name : `${uid}-name`);
  const idLabel = $derived(label?.trim() ? `${uid}-label` : undefined);
  const idDesc = $derived(bottom?.trim() ? `${uid}-desc` : undefined);
  const idErr = $derived(idDesc ?? `${uid}-err`);
  const roleGroup = $derived(multiple ? "group" : "radiogroup");
  let errmsg = $state("");
  const message = $derived(variant === VARIANT.INACTIVE ? errmsg || bottom : bottom);

  // *** States *** //
  let neutral = $state(isNeutral(variant) ? variant : VARIANT.NEUTRAL);
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  const live = $derived(variant === VARIANT.INACTIVE ? "alert" : undefined);
  const invalid = $derived(variant === VARIANT.INACTIVE ? true : undefined);
  const idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);
  const reqd = $derived(required && (!multiple || !values.length) ? true : undefined);
  function shift(oninvalid: boolean = false, msg?: string) {
    const vmsg = elements[0]?.validationMessage ?? "";
    variant = msg ? VARIANT.INACTIVE : !values.length && !oninvalid ? neutral : vmsg ? VARIANT.INACTIVE : VARIANT.ACTIVE;
    errmsg = msg ? msg : vmsg;
  }
  function verify() {
    if (!elements[0]) return;
    for (const v of validations) {
      const msg = v({ value: values, validity: elements[0].validity, element: elements[0] });
      if (msg) return elements[0].setCustomValidity(msg);
    }
    elements[0].setCustomValidity("");
  }
  function check(value: string): string {
    if (!elements[0]) return "";
    for (const c of constraints) {
      const msg = c({ value, values, validity: elements[0].validity, element: elements[0] });
      if (msg) return msg;
    }
    return "";
  }

  // *** Reactive Handlers *** //
  const opts = $derived(Array.from(options, ([value, text]) => ({ value, text, checked: values.includes(value) })));
  $effect.pre(() => {
    values;
    untrack(() => validate(true));
  });
  function validate(effect?: boolean) {
    if (effect && isNeutral(variant)) return;
    verify();
    shift();
  }

  // *** Event Handlers *** //
  const hchange: ChangeEventHandler<HTMLInputElement> = (ev) => {
    onchange?.(ev);
    const input = ev.currentTarget;
    if (input.checked) {
      const msg = check(input.value);
      if (msg) {
        input.checked = false;
        shift(false, msg);
        return;
      }
    }
    values = elements.filter((el) => el.checked).map((el) => el.value);
    validate();
  };
  const hinvalid: EventHandler<Event, HTMLInputElement> = (ev) => {
    oninvalid?.(ev);
    ev.preventDefault();
    shift(true);
  };
  onMount(() => verify());
</script>

<!---------------------------------------->

{#if opts.length}
  <div class={cls(PARTS.WHOLE, variant)} role="group" aria-labelledby={idLabel}>
    {#if label?.trim() || aux}
      <div class={cls(PARTS.TOP, variant)}>
        {@render lbl()}
        {#if aux}
          <span class={cls(PARTS.AUX, variant)}>{@render aux(values, variant, elements)}</span>
        {/if}
      </div>
    {/if}
    {@render main()}
    {#if reserve || message?.trim()}
      <div class={cls(PARTS.BOTTOM, variant)} id={idDesc ?? idErr} role={live}>{message}</div>
    {/if}
  </div>
{/if}

{#snippet lbl()}
  {#if label?.trim()}
    <span class={cls(PARTS.LABEL, variant)} id={idLabel}>
      {label}
      {#if extra?.trim()}
        <span class={cls(PARTS.EXTRA, variant)}>{extra}</span>
      {/if}
    </span>
  {/if}
{/snippet}
{#snippet main()}
  <div
    class={cls(PARTS.MIDDLE, variant)}
    role={roleGroup}
    aria-labelledby={idLabel}
    aria-describedby={idDesc}
    aria-invalid={!multiple ? invalid : undefined}
    aria-errormessage={!multiple ? idMsg : undefined}
  >
    {#each opts as { value, text, checked }, i (value)}
      {@const stat = checked ? VARIANT.ACTIVE : neutral}
      <label class={cls(PARTS.MAIN, stat)}>
        <input
          bind:this={elements[i]}
          class={[cls(PARTS.LEFT, stat), c]}
          {...rest}
          required={reqd}
          aria-invalid={multiple ? invalid : undefined}
          aria-errormessage={multiple ? idMsg : undefined}
          {value}
          name={nm}
          {type}
          {checked}
          onchange={hchange}
          oninvalid={hinvalid}
          {@attach attach}
        />
        <span class={cls(PARTS.RIGHT, stat)}>{text}</span>
      </label>
    {/each}
  </div>
{/snippet}
