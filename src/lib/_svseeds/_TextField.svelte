<!--
  @component
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
    descFirst?: boolean; // (false)
    value?: string; // bindable
    type?: "text" | "area" | "email" | "password" | "search" | "tel" | "url";  // ("text")
    options?: SvelteSet<string> | Set<string>;
    validations?: TextFieldValidation[];
    attach?: Attachment;
    element?: HTMLInputElement | HTMLTextAreaElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // class & other input/textarea attributes are passed to the control via ...rest (class is merged onto the control)
  }
  type TextFieldValidation = (value: string, validity: ValidityState) => string | undefined;
  ```
  ### Anatomy
  ```svelte
  <div class="whole">
    <div class="top" conditional>
      <label class="label" conditional>
        {label}
        <span class="extra" conditional>{extra}</span>
      </label>
      <span class="aux" conditional>{aux}</span>
    </div>
    <div class="middle">
      <span class="left" conditional>{left}</span>
      {#if type === "area"}
        <textarea class={["main", class]} {...rest} bind:value bind:this={element} {@attach attach}></textarea>
      {:else}
        <input class={["main", class]} {...rest} {type} bind:value bind:this={element} {@attach attach} />
        <datalist conditional>
          {#each options as option}
            <option value={option}></option>
          {/each}
        </datalist>
      {/if}
      <span class="right" conditional>{right}</span>
    </div>
    <div class="bottom" conditional>{bottom}</div>
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
    descFirst?: boolean; // (false)
    value?: string; // bindable
    type?: "text" | "area" | "email" | "password" | "search" | "tel" | "url"; // ("text")
    options?: SvelteSet<string> | Set<string>;
    validations?: TextFieldValidation[];
    attach?: Attachment;
    element?: HTMLInputElement | HTMLTextAreaElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
  }
  export type TextFieldReqdProps = never;
  export type TextFieldBindProps = "value" | "variant" | "element";
  export type TextFieldValidation = (value: string, validity: ValidityState) => string | undefined;

  const preset = "svs-text-field";

  import { type Snippet, untrack } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type SvelteSet } from "svelte/reactivity";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isNeutral } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { label, extra, aux, left, right, bottom, descFirst = false, value = $bindable(""), type = "text", options, validations = [], id, onchange, oninvalid, attach, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), class: c, ...rest }: TextFieldProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const uid = $props.id();
  const idMain = $derived(id ? id : label?.trim() ? `${uid}-ctrl` : undefined);
  const idLabel = $derived(label?.trim() ? `${uid}-label` : undefined);
  const idDesc = $derived(bottom?.trim() ? `${uid}-desc` : undefined);
  const idList = $derived(options?.size ? `${uid}-list` : undefined);
  const idErr = $derived(idDesc ?? `${uid}-err`);
  // svelte-ignore state_referenced_locally
  let message = $state(bottom);

  // *** States *** //
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  let live = $derived(variant === VARIANT.INACTIVE ? "alert" : "status");
  let invalid = $derived(variant === VARIANT.INACTIVE ? true : undefined);
  let idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid?: boolean) {
    const vmsg = element?.validationMessage ?? "";
    variant = !value && !oninvalid ? neutral : vmsg ? VARIANT.INACTIVE : VARIANT.ACTIVE;
    message = variant === VARIANT.INACTIVE ? (vmsg ? vmsg : bottom) : bottom;
  }
  function verify() {
    if (!element) return;
    for (const v of validations) {
      const msg = v(value, element.validity);
      if (msg) return element.setCustomValidity(msg);
    }
    element.setCustomValidity("");
  }

  // *** Bind Handlers *** //
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
  function hchange(ev: Event) {
    onchange?.(ev as any);
    validate();
  }
  function hinvalid(ev: Event) {
    oninvalid?.(ev as any);
    ev.preventDefault();
    shift(true);
  }
  $effect(() => untrack(() => verify()));
</script>

<!---------------------------------------->

<div class={cls(PARTS.WHOLE, variant)} role="group" aria-labelledby={idLabel}>
  {#if aux}
    <div class={cls(PARTS.TOP, variant)}>
      {@render lbl()}
      <span class={cls(PARTS.AUX, variant)}>{@render aux(value, variant, element)}</span>
    </div>
  {:else}
    {@render lbl()}
  {/if}
  {@render desc(descFirst)}
  <div class={cls(PARTS.MIDDLE, variant)}>
    {@render side(PARTS.LEFT, left)}
    {@render main()}
    {@render side(PARTS.RIGHT, right)}
  </div>
  {@render desc(!descFirst)}
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
  {#if type === "area"}
    <textarea
      bind:value
      bind:this={element}
      class={[cls(PARTS.MAIN, variant), c]}
      {...rest as any}
      id={idMain}
      onchange={hchange}
      oninvalid={hinvalid}
      aria-describedby={idDesc}
      aria-invalid={invalid}
      aria-errormessage={idMsg}
      {@attach attach}
    ></textarea>
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
  {#if show && message?.trim()}
    <div class={cls(PARTS.BOTTOM, variant)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}
