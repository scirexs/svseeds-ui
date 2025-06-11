<!--
  @component
  default value: `(value)`
  ```ts
  interface TagsInputFieldProps {
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string, HTMLInputElement | undefined]>; // Snippet<[values,variant,element]>
    left?: Snippet<[string[], string, HTMLInputElement | undefined]>; // Snippet<[values,variant,element]>
    right?: Snippet<[string[], string, HTMLInputElement | undefined]>; // Snippet<[values,variant,element]>
    bottom?: string;
    descFirst?: boolean; // (false)
    values?: string[]; // bindable
    min?: TagsInputFieldCountValidation;
    max?: TagsInputFieldCountValidation;
    constraints?: TagsInputFieldConstraint[];
    validations?: TagsInputFieldValidation[];
    name?: string;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
    deps?: TagsInputFieldDeps;
  }
  interface TagsInputFieldDeps extends TagsInputDeps {
    svsTagsInput?: Omit<TagsInputProps, TagsInputReqdProps | TagsInputBindProps | "deps">;
  }
  type TagsInputFieldConstraint = (value: string, validity: ValidityState) => string | undefined;
  type TagsInputFieldValidation = (values: string[], validity: ValidityState) => string | undefined;
  type TagsInputFieldCountValidation = {
    value: number;
    message: string;
  };
  ```
-->
<script module lang="ts">
  export interface TagsInputFieldProps {
    label?: string;
    extra?: string;
    aux?: Snippet<[string[], string, HTMLInputElement | undefined]>; // Snippet<[values,variant,element]>
    left?: Snippet<[string[], string, HTMLInputElement | undefined]>; // Snippet<[values,variant,element]>
    right?: Snippet<[string[], string, HTMLInputElement | undefined]>; // Snippet<[values,variant,element]>
    bottom?: string;
    descFirst?: boolean; // (false)
    values?: string[]; // bindable
    min?: TagsInputFieldCountValidation;
    max?: TagsInputFieldCountValidation;
    constraints?: TagsInputFieldConstraint[];
    validations?: TagsInputFieldValidation[];
    name?: string;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
    deps?: TagsInputFieldDeps;
  }
  export interface TagsInputFieldDeps {
    svsTagsInput?: Omit<TagsInputProps, TagsInputReqdProps | TagsInputBindProps>;
  }
  export type TagsInputFieldReqdProps = never;
  export type TagsInputFieldBindProps = "values" | "variant" | "element";
  export type TagsInputFieldConstraint = (value: string, validity: ValidityState) => string | undefined;
  export type TagsInputFieldValidation = (values: string[], validity: ValidityState) => string | undefined;
  export type TagsInputFieldCountValidation = { value: number, message: string };

  const preset = "svs-tags-input-field";

  import { type Snippet, untrack } from "svelte";
  import { type SVSClass, VARIANT, PARTS, elemId, fnClass, isNeutral, omit } from "./core";
  import TagsInput, { type TagsInputProps, type TagsInputReqdProps, type TagsInputBindProps } from "./_TagsInput.svelte";
</script>

<script lang="ts">
  let { label, extra, aux, left, right, bottom, descFirst = false, values = $bindable([]), min, max, constraints = [], validations = [], name, element = $bindable(), styling, variant = $bindable(""), deps }: TagsInputFieldProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const id = deps?.svsTagsInput?.attributes?.id ? deps.svsTagsInput.attributes.id : elemId.get(label?.trim());
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idErr = idDesc ?? elemId.id;
  let message = $state(bottom);
  let value = $state("");
  if (!name) name = deps?.svsTagsInput?.attributes?.name as string | undefined;
  if (max) constraints.unshift(() => values.length >= max.value ? max.message : "");
  if (min) validations.unshift(() => values.length < min.value ? min.message : "");

  // *** Initialize Deps *** //
  const svsTagsInput = {
    ...omit(deps?.svsTagsInput, "styling", "attributes"),
    events: { onadd, onremove: deps?.svsTagsInput?.events?.onremove },
    styling: deps?.svsTagsInput?.styling ?? `${preset} svs-tags-input`,
    attributes: {
      ...omit(deps?.svsTagsInput?.attributes, "id", "name", "onchange", "oninvalid", "aria-describedby"),
      id,
      onchange,
      oninvalid,
      "aria-describedby": idDesc,
    },
  };

  // *** States *** //
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  $effect(() => { neutral = isNeutral(variant) ? variant : neutral });
  let live = $derived(variant === VARIANT.INACTIVE ? "alert" : "status");
  let idMsg = $derived(variant === VARIANT.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid: boolean = false, msg?: string) {
    const vmsg = element?.validationMessage ?? "";
    variant = getStatus(oninvalid, vmsg, msg);
    message = variant === VARIANT.INACTIVE ? msg ? msg : vmsg ? vmsg : bottom : bottom;
  }
  function getStatus(oninvalid: boolean, vmsg: string, msg?: string): string {
    if (msg || (oninvalid && vmsg)) return VARIANT.INACTIVE;
    if (!values.length || vmsg) return neutral;
    return VARIANT.ACTIVE;
  }
  function verify() {
    if (!element) return;
    for (const v of validations) {
      const msg = v(values, element.validity);
      if (msg) return element.setCustomValidity(msg);
    }
    element.setCustomValidity("");
  }

  // *** Bind Handlers *** //
  $effect.pre(() => {
    values;
    untrack(() => validate());
  });
  function validate() {
    verify();
    shift();
  }

  // *** Event Handlers *** //
  function onadd(values: string[], value: string): void | boolean {
    if (deps?.svsTagsInput?.events?.onadd?.(values, value)) return true;
    variant = neutral;
    shift(false, check());
    return variant === VARIANT.INACTIVE;
  }
  function check(): string | undefined {
    if (!element) return;
    for (const c of constraints) {
      const msg = c(value, element.validity);
      if (msg) return msg;
    }
  }
  function onchange(ev: Event) {
    deps?.svsTagsInput?.attributes?.onchange?.(ev as any);
    if (!isNeutral(variant)) shift();
  }
  function oninvalid(ev: Event) {
    deps?.svsTagsInput?.attributes?.oninvalid?.(ev as any);
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
      <span class={cls(PARTS.AUX, variant)}>{@render aux(values, variant, element)}</span>
    </div>
  {:else}
    {@render lbl()}
  {/if}
  {@render desc(descFirst)}
  <div class={cls(PARTS.MIDDLE, variant)}>
    {@render side(PARTS.LEFT, left)}
    {@render fnForm()}
    <TagsInput bind:values bind:value bind:variant bind:element bind:ariaErrMsgId={idMsg} {...svsTagsInput} />
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
{#snippet side(area: string, body?: Snippet<[string[], string, HTMLInputElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(values, variant, element)}</span>
  {/if}
{/snippet}
{#snippet desc(show: boolean)}
  {#if show && message?.trim()}
    <div class={cls(PARTS.BOTTOM, variant)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}
{#snippet fnForm()}
  {#if name}
    {#each values as value}
      <input type="hidden" {name} {value} />
    {/each}
  {/if}
{/snippet}
