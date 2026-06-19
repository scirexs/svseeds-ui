<!--
  @component
  ### Usage
  Use standalone.
  ```svelte
  <TextField {...props} />
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface TextFieldProps extends Omit<HTMLInputAttributes, "type" | "value"> {
    label?: string;
    extra?: string;
    aux?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>; // Snippet<[value,variant,element]>
    bottom?: string;
    reserve?: boolean; // (false)
    flip?: boolean; // (false)
    value?: string; // bindable
    type?: "text" | "textarea" | "email" | "password" | "search" | "tel" | "url";  // ("text")
    options?: SvelteSet<string> | Set<string>;
    validations?: TextFieldValidation[];
    attach?: Attachment<HTMLInputElement | HTMLTextAreaElement>;
    element?: HTMLInputElement | HTMLTextAreaElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // class & other input/textarea attributes are passed to the control via ...rest (class is merged onto the control)
    // --- for textarea attributes ---
    cols?: number | undefined | null;
    rows?: number | undefined | null;
    wrap?: "hard" | "soft" | "off" | undefined | null;
  }
  type TextFieldValidation = SVSFieldValidation<string, HTMLInputElement | HTMLTextAreaElement>;
  ```
  ### Anatomy
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
      {#if type === "textarea"}
        <textarea class="main" {...rest}></textarea>
      {:else}
        <input class="main" {...rest} {type} />
        <datalist conditional>
          {#each options as option}
            <option value={option}></option>
          {/each}
        </datalist>
      {/if}
      <span class="right" conditional>{right}</span>
    </div>
    <div class="bottom" conditional: has text, or always when reserve>{bottom}</div>
  </div>
  ```
-->
<script module lang="ts">
  export interface TextFieldProps extends Omit<HTMLInputAttributes, "type" | "value"> {
    label?: string;
    extra?: string;
    aux?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>; // Snippet<[value,variant,element]>
    bottom?: string;
    reserve?: boolean; // (false)
    flip?: boolean; // (false)
    value?: string; // bindable
    type?: "text" | "textarea" | "email" | "password" | "search" | "tel" | "url"; // ("text")
    options?: SvelteSet<string> | Set<string>;
    validations?: TextFieldValidation[];
    attach?: Attachment<HTMLInputElement | HTMLTextAreaElement>;
    element?: HTMLInputElement | HTMLTextAreaElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // --- for textarea attributes ---
    cols?: number | undefined | null;
    rows?: number | undefined | null;
    wrap?: "hard" | "soft" | "off" | undefined | null;
  }
  export type TextFieldReqdProps = never;
  export type TextFieldBindProps = "value" | "variant" | "element";
  export type TextFieldValidation = SVSFieldValidation<string, HTMLInputElement | HTMLTextAreaElement>;

  export const _TEXT_FIELD_PRESET = "svs-text-field";

  import { onMount, untrack } from "svelte";
  import { VARIANT, PARTS, fnClass, isNeutral } from "./core";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { SvelteSet } from "svelte/reactivity";
  import type { HTMLInputAttributes } from "svelte/elements";
  import type { SVSClass, SVSVariant, SVSFieldValidation } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, extra, aux, left, right, bottom, reserve = false, flip = false, value = $bindable(""), type = "text", cols, rows, wrap, options, validations = [], id, onchange, oninvalid, attach, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), class: c, ...rest }: TextFieldProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(_TEXT_FIELD_PRESET, styling));
  const uid = $props.id();
  const idMain = $derived(id ? id : label?.trim() ? `${uid}-ctrl` : undefined);
  const idLabel = $derived(label?.trim() ? `${uid}-label` : undefined);
  const idDesc = $derived(bottom?.trim() ? `${uid}-desc` : undefined);
  const idList = $derived(options?.size ? `${uid}-list` : undefined);
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
  $effect.pre(() => {
    value;
    untrack(() => validate(true));
  });
  function validate(effect?: boolean) {
    if (effect && isNeutral(variant)) return;
    verify();
    shift();
  }

  // *** Event Handlers *** //
  const hchange = (ev: Event) => {
    onchange?.(ev as any);
    validate();
  };
  const hinvalid = (ev: Event) => {
    oninvalid?.(ev as any);
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
  {@render desc(flip)}
  <div class={cls(PARTS.MIDDLE, variant)}>
    {@render side(PARTS.LEFT, left)}
    {@render main()}
    {@render side(PARTS.RIGHT, right)}
  </div>
  {@render desc(!flip)}
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
{#snippet side(area: string, body?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(value, variant, element)}</span>
  {/if}
{/snippet}
{#snippet main()}
  {#if type === "textarea"}
    <textarea
      bind:value
      bind:this={element}
      class={[cls(PARTS.MAIN, variant), c]}
      {...rest as any}
      id={idMain}
      {cols}
      {rows}
      {wrap}
      onchange={hchange}
      oninvalid={hinvalid}
      aria-describedby={idDesc}
      aria-invalid={invalid}
      aria-errormessage={idMsg}
      {@attach attach}></textarea>
  {:else}
    <input
      bind:value
      bind:this={element}
      class={[cls(PARTS.MAIN, variant), c]}
      {...rest}
      list={idList}
      id={idMain}
      {type}
      onchange={hchange}
      oninvalid={hinvalid}
      aria-describedby={idDesc}
      aria-invalid={invalid}
      aria-errormessage={idMsg}
      {@attach attach}
    />
    {#if options?.size}
      <datalist id={idList}>
        {#each options as option (option)}
          <option value={option}></option>
        {/each}
      </datalist>
    {/if}
  {/if}
{/snippet}
{#snippet desc(show: boolean)}
  {#if show && (reserve || message?.trim())}
    <div class={cls(PARTS.BOTTOM, variant)} id={idErr} role={live}>{message}</div>
  {/if}
{/snippet}
