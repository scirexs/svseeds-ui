<script module lang="ts">
  export type TextFieldProps = {
    label?: string,
    extra?: string,
    aux?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>, // Snippet<[status,value,element]>
    left?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>, // Snippet<[status,value,element]>
    right?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>, // Snippet<[status,value,element]>
    bottom?: string, // bindable
    value?: string, // bindable
    type?: "text" | "area" | "email" | "password" | "search" | "tel" | "url" | "number",  // bindable <"text">
    options?: SvelteSet<string> | Set<string>,
    descFirst?: boolean, // <false>
    validations?: ((value: string, validity?: ValidityState) => string)[],
    status?: string, // bindable <STATE.DEFAULT>
    style?: ClassRuleSet | string,
    attributes?: HTMLInputAttributes | HTMLTextareaAttributes,
    action?: Action,
    element?: HTMLInputElement | HTMLTextAreaElement, // bindable
  };
  export type TextFieldReqdProps = never;
  export type TextFieldBindProps = "bottom" | "value" | "type" | "status" | "element";

  const svs = "svs-text-field";
  const preset: ClassRuleSet = {};

  import { type Snippet, untrack } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteSet } from "svelte/reactivity";
  import { type HTMLInputAttributes, type HTMLTextareaAttributes } from "svelte/elements";
  import { type ClassRuleSet, STATE, AREA, elemId, fnClass, isNeutral, omit } from "./core";
</script>

<script lang="ts">
  let { label, extra, aux, left, right, bottom = $bindable(), value = $bindable(""), type = $bindable("text"), options, descFirst = false, validations = [], status = $bindable(""), style, attributes, action, element = $bindable() }: TextFieldProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(svs, preset, style);
  const id = attributes?.id ? attributes.id : elemId.get(label?.trim());
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idList = elemId.get(options?.size);
  const idErr = idDesc ?? elemId.get(true);
  const attrs = omit(attributes as any, "class", "id", "type", "value", "list", "onchange", "oninvalid");
  const description = bottom;

  // *** Status *** //
  let neutral = isNeutral(status) ? status : STATE.DEFAULT;
  $effect(() => { neutral = isNeutral(status) ? status : neutral });
  let alert = $derived(status === STATE.INACTIVE ? "alert" : undefined);
  let invalid = $derived(status === STATE.INACTIVE ? true : undefined);
  let errMsg = $derived(status === STATE.INACTIVE ? idErr : undefined);
  const toInvalid = (msg?: string) => shiftStatus(STATE.INACTIVE, msg);
  const toNonInvalid = (stat: string) => shiftStatus(stat);
  function shiftStatus(stat: string, msg?: string) {
    status = stat;
    bottom = msg ?? description;
    element?.setCustomValidity(msg ?? "");
  }
  function validate(onchange?: boolean) {
    if (!value && onchange) return toNonInvalid(neutral);
    for (const v of validations) {
      const msg = v(value, element?.validity);
      if (msg) return toInvalid(msg);
    }
    toNonInvalid(STATE.ACTIVE);
  }

  // *** Bind Handlers *** //
  $effect.pre(() => {
    value;
    untrack(() => conditionalValidate());
  });
  function conditionalValidate() {
    if (isNeutral(status)) return;
    validate();
  }

  // *** Event Handlers *** //
  function onchange(ev: Event) {
    attributes?.onchange?.(ev as any);
    validate(true);
  }
  function oninvalid(ev: Event) {
    attributes?.oninvalid?.(ev as any);
    ev.preventDefault();
    validate();
    if (status !== STATE.INACTIVE) toInvalid(element?.validationMessage);
  }
</script>

<!---------------------------------------->

{#if label?.trim() || aux || left || right || bottom?.trim()}
  <div class={cls(AREA.WHOLE, status)} role="group" aria-labelledby={idLabel}>
    {#if aux}
      <div class={cls(AREA.TOP, status)}>
        {@render lbl()}
        <span class={cls(AREA.AUX, status)}>{@render aux(status, value, element)}</span>
      </div>
    {:else}
      {@render lbl()}
    {/if}
    {@render desc(descFirst)}
    <div class={cls(AREA.MIDDLE, status)}>
      {@render side(AREA.LEFT, left)}
      {@render main()}
      {@render side(AREA.RIGHT, right)}
    </div>
    {@render desc(!descFirst)}
  </div>
{:else}
  {@render main()}
{/if}

{#snippet lbl()}
  {#if label?.trim()}
    <label class={cls(AREA.LABEL, status)} for={id} id={idLabel}>
      {label}
      {#if extra?.trim()}
        <span class={cls(AREA.EXTRA, status)}>{extra}</span>
      {/if}
    </label>
  {/if}
{/snippet}
{#snippet side(area: string, body?: Snippet<[string, string, HTMLInputElement | HTMLTextAreaElement | undefined]>)}
  {#if body}
    <span class={cls(area, status)}>{@render body(status, value, element)}</span>
  {/if}
{/snippet}
{#snippet main()}
  {@const c = cls(AREA.MAIN, status)}
  {@const msg = bottom?.trim() ? errMsg : undefined}
  {#if type === "area"}
    {#if action}
      <textarea bind:value bind:this={element} class={c} {id} {onchange} {oninvalid} {...attrs} aria-describedby={idDesc} aria-invalid={invalid} aria-errormessage={msg} use:action></textarea>
    {:else}
      <textarea bind:value bind:this={element} class={c} {id} {onchange} {oninvalid} {...attrs} aria-describedby={idDesc} aria-invalid={invalid} aria-errormessage={msg}></textarea>
    {/if}
  {:else}
    {#if action}
      <input bind:value bind:this={element} class={c} list={idList} {id} {type} {onchange} {oninvalid} {...attrs} aria-describedby={idDesc} aria-invalid={invalid} aria-errormessage={msg} use:action />
    {:else}
      <input bind:value bind:this={element} class={c} list={idList} {id} {type} {onchange} {oninvalid} {...attrs} aria-describedby={idDesc} aria-invalid={invalid} aria-errormessage={msg} />
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
  {#if show && bottom?.trim()}
    <div class={cls(AREA.BOTTOM, status)} id={idDesc ?? idErr} role={alert}>{bottom}</div>
  {/if}
{/snippet}
