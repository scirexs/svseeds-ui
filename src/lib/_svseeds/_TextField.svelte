<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface TextFieldProps {
    label?: string;
    extra?: string;
    aux?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>; // Snippet<[value,variant,element]>
    bottom?: string;
    descFirst?: boolean; // (false)
    value?: string; // bindable
    type?: "text" | "area" | "email" | "password" | "search" | "tel" | "url";  // bindable ("text")
    options?: SvelteSet<string> | Set<string>;
    validations?: TextFieldValidation[];
    attributes?: HTMLInputAttributes | HTMLTextareaAttributes;
    action?: Action;
    element?: HTMLInputElement | HTMLTextAreaElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
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
        <textarea class={"main"} {...attributes} bind:value bind:this={element} use:action></textarea>
      {:else}
        <input class={"main"} {type} {...attributes} bind:value bind:this={element} use:action />
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
  export interface TextFieldProps {
    label?: string;
    extra?: string;
    aux?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>; // Snippet<[value,variant,element]>
    bottom?: string;
    descFirst?: boolean; // (false)
    value?: string; // bindable
    type?: "text" | "area" | "email" | "password" | "search" | "tel" | "url";  // bindable ("text")
    options?: SvelteSet<string> | Set<string>;
    validations?: TextFieldValidation[];
    attributes?: HTMLInputAttributes | HTMLTextareaAttributes;
    action?: Action;
    element?: HTMLInputElement | HTMLTextAreaElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type TextFieldReqdProps = never;
  export type TextFieldBindProps = "value" | "type" | "variant" | "element";
  export type TextFieldValidation = (value: string, validity: ValidityState) => string | undefined;

  const preset = "svs-text-field";

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteSet } from "svelte/reactivity";
  import { type HTMLInputAttributes, type HTMLTextareaAttributes } from "svelte/elements";
  import { type SVSClass, VARIANT, PARTS, elemId, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { label, extra, aux, left, right, bottom, descFirst = false, value = $bindable(""), type = $bindable("text"), options, validations = [], attributes, action, element = $bindable(), styling, variant = $bindable("") }: TextFieldProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const id = attributes?.id ? attributes.id : elemId.get(label?.trim());
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idList = elemId.get(options?.size);
  const idErr = idDesc ?? elemId.id;
  const attrs = omit(attributes as any, "class", "id", "type", "value", "list", "onchange", "oninvalid");
  let message = $state(bottom);

  // *** States *** //
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  $effect(() => { neutral = isNeutral(variant) ? variant : neutral });
  let live = $derived(variant === VARIANT.INACTIVE ? "alert" : "status");
  let invalid = $derived(variant === VARIANT.INACTIVE ? true : undefined);
  let idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid?: boolean) {
    const vmsg = element?.validationMessage ?? "";
    variant = !value && !oninvalid ? neutral : vmsg ? VARIANT.INACTIVE : VARIANT.ACTIVE;
    message = variant === VARIANT.INACTIVE ? vmsg ? vmsg : bottom : bottom;
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
  function onchange(ev: Event) {
    attributes?.onchange?.(ev as any);
    validate();
  }
  function oninvalid(ev: Event) {
    attributes?.oninvalid?.(ev as any);
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
    <label class={cls(PARTS.LABEL, variant)} for={id} id={idLabel}>
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
  {@const c = cls(PARTS.MAIN, variant)}
  {#if type === "area"}
    {#if action}
      <textarea bind:value bind:this={element} class={c} {id} {onchange} {oninvalid} {...attrs} aria-describedby={idDesc} aria-invalid={invalid} aria-errormessage={idMsg} use:action></textarea>
    {:else}
      <textarea bind:value bind:this={element} class={c} {id} {onchange} {oninvalid} {...attrs} aria-describedby={idDesc} aria-invalid={invalid} aria-errormessage={idMsg}></textarea>
    {/if}
  {:else}
    {#if action}
      <input bind:value bind:this={element} class={c} list={idList} {id} {type} {onchange} {oninvalid} {...attrs} aria-describedby={idDesc} aria-invalid={invalid} aria-errormessage={idMsg} use:action />
    {:else}
      <input bind:value bind:this={element} class={c} list={idList} {id} {type} {onchange} {oninvalid} {...attrs} aria-describedby={idDesc} aria-invalid={invalid} aria-errormessage={idMsg} />
    {/if}
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
