<script module lang="ts">
  // version: 0.1.0
  export type TextFieldProps = {
    label?: string,
    extra?: string,
    aux?: Snippet<[string, StateName, HTMLInputElement | HTMLTextAreaElement | undefined]>,   // Snippet<[value,status,element]>
    left?: Snippet<[string, StateName, HTMLInputElement | HTMLTextAreaElement | undefined]>,  // Snippet<[value,status,element]>
    right?: Snippet<[string, StateName, HTMLInputElement | HTMLTextAreaElement | undefined]>, // Snippet<[value,status,element]>
    bottom?: string,  // bindable
    value?: string,  // bindable, [""]
    type?: "text" | "area" | "email" | "password" | "search" | "tel" | "url" | "number",  // bindable, ["text"]
    options?: string[],  // bindable
    status?: StateName,  // bindable, [STATE.DEFAULT]
    validations?: ((value: string, validity?: ValidityState) => string)[],
    style?: ClassRuleSet | string,
    attributes?: HTMLInputAttributes & HTMLTextareaAttributes,
    action?: Action,
    element?: HTMLInputElement | HTMLTextAreaElement,  // bindable
  };

  const seed = "text-field";
  const preset: ClassRuleSet = {};

  type TextFieldEvent = Event & { currentTarget: EventTarget & HTMLInputElement & HTMLTextAreaElement; };
  import { type Snippet } from "svelte";
  import { type Action } from "svelte/action";
  import { type HTMLInputAttributes, type HTMLTextareaAttributes } from "svelte/elements";
  import { type ClassRuleSet, type StateName, STATE, AREA, elemId, getClassFn, isUndef, omit } from "./_core";
</script>

<script lang="ts">
  let { label, extra, aux, left, right, bottom = $bindable(), value = $bindable(""), type = $bindable("text"), options = $bindable(), status = $bindable(STATE.DEFAULT), validations = [], style = {}, attributes = {}, action, element = $bindable() }: TextFieldProps = $props();

  // *** Initialize *** //
  const cls = getClassFn(seed, preset, style);
  const id = !isUndef(attributes.id) ? attributes.id : elemId.get(label);
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idList = elemId.get(Array.isArray(options));
  const idErr = isUndef(idDesc) ? elemId.get(true) : idDesc;
  const attrs = omit({ ...attributes }, "class", "id", "type", "value", "list", "onchange", "oninput", "oninvalid");
  const description = bottom;

  // *** Status *** //
  let role = $derived(isInvalid() ? "alert" : undefined);
  let invalid = $derived(isInvalid() ? true : undefined);
  let errMsg = $derived(isInvalid() ? idErr : undefined);
  function isInvalid() { return status === STATE.INACTIVE && !isUndef(bottom); }
  function toInvalid(msg?: string) { shiftStatus(STATE.INACTIVE, msg); }
  function toNonInvalid(stat: StateName) { shiftStatus(stat); }
  function shiftStatus(stat: StateName, msg?: string) {
    status = stat;
    bottom = msg ?? description;
    element?.setCustomValidity(msg ?? "");
  }
  function validate(onchange?: boolean) {
    if (!value && onchange) return toNonInvalid(STATE.DEFAULT);
    for (let i = 0; i < validations.length; i++) {
      const msg = validations[i](value, element?.validity);
      if (msg) return toInvalid(msg);
    }
    toNonInvalid(STATE.ACTIVE);
  }

  // *** Event Handlers *** //
  // const debounceValidate = debounce(300, validate);
  function onchange(ev: Event) {
    attributes.onchange?.(ev as TextFieldEvent);
    validate(true);
  }
  function oninput(ev: Event) {
    attributes.oninput?.(ev as TextFieldEvent);
    if (status === STATE.DEFAULT) return;
    validate();  // debounceValidate();
  }
  function oninvalid(ev: Event) {
    attributes.oninvalid?.(ev as TextFieldEvent);
    validate();
    if (status !== STATE.INACTIVE) toInvalid(element?.validationMessage);
  }
</script>

<!---------------------------------------->

<div class={cls(AREA.WHOLE, status)} role="group" aria-labelledby={idLabel}>
  {#if typeof aux === "function"}
    <div class={cls(AREA.TOP, status)}>
      {@render lbl()}
      {#if typeof aux === "function"}
        <span class={cls(AREA.AUX, status)}>{@render aux(value, status, element)}</span>
      {/if}
    </div>
  {:else}
    {@render lbl()}
  {/if}
  {#if typeof left === "function" || typeof right === "function"}
    <div class={cls(AREA.MIDDLE, status)}>
      {#if typeof left === "function"}
        <span class={cls(AREA.LEFT, status)}>{@render left(value, status, element)}</span>
      {/if}
      {@render main()}
      {#if typeof right === "function"}
        <span class={cls(AREA.RIGHT, status)}>{@render right(value, status, element)}</span>
      {/if}
    </div>
  {:else}
    {@render main()}
  {/if}
  {#if bottom?.trim()}
    <output class={cls(AREA.BOTTOM, status)} id={idDesc ?? idErr} {role}>{bottom}</output>
  {/if}
</div>

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
{#snippet main()}
  {#if type === "area"}
    {#if typeof action === "function"}
      <textarea bind:value bind:this={element} class={cls(AREA.MAIN, status)} {id} {onchange} {oninput} {oninvalid} {...attrs} use:action aria-describedby={idDesc} aria-controls={idDesc} aria-invalid={invalid} aria-errormessage={errMsg}></textarea>
    {:else}
      <textarea bind:value bind:this={element} class={cls(AREA.MAIN, status)} {id} {onchange} {oninput} {oninvalid} {...attrs} aria-describedby={idDesc} aria-controls={idDesc} aria-invalid={invalid} aria-errormessage={errMsg}></textarea>
    {/if}
  {:else}
    {#if typeof action === "function"}
      <input bind:value bind:this={element} class={cls(AREA.MAIN, status)} list={idList} {id} {type} {onchange} {oninput} {oninvalid} {...attrs} use:action aria-describedby={idDesc} aria-controls={idDesc} aria-invalid={invalid} aria-errormessage={errMsg} />
    {:else}
      <input bind:value bind:this={element} class={cls(AREA.MAIN, status)} list={idList} {id} {type} {onchange} {oninput} {oninvalid} {...attrs} aria-describedby={idDesc} aria-controls={idDesc} aria-invalid={invalid} aria-errormessage={errMsg} />
    {/if}
    {#if Array.isArray(options) && options.length > 0}
      <datalist id={idList}>
        {#each options as option (option)}
          <option value={option}></option>
        {/each}
      </datalist>
    {/if}
  {/if}
{/snippet}
