<script module lang="ts">
  export type TagsInputFieldProps = {
    label?: string,
    extra?: string,
    aux?: Snippet<[string, string[], HTMLInputElement | undefined]>, // Snippet<[status,values,element]>
    left?: Snippet<[string, string[], HTMLInputElement | undefined]>, // Snippet<[status,values,element]>
    right?: Snippet<[string, string[], HTMLInputElement | undefined]>, // Snippet<[status,values,element]>
    bottom?: string,
    descFirst?: boolean, // <false>
    values?: string[], // bindable
    min?: TagsInputFieldCountValidation,
    max?: TagsInputFieldCountValidation,
    constraints?: TagsInputFieldConstraint[],
    validations?: TagsInputFieldValidation[],
    status?: string, // bindable <STATE.DEFAULT>
    style?: SVSStyle,
    element?: HTMLInputElement, // bindable
    deps?: TagsInputFieldDeps,
  };
  export type TagsInputFieldDeps = {
    svsTagsInput?: Omit<TagsInputProps, TagsInputReqdProps | TagsInputBindProps | "deps">,
  } & TagsInputDeps;
  export type TagsInputFieldReqdProps = never;
  export type TagsInputFieldBindProps = "values" | "status" | "element";
  export type TagsInputFieldConstraint = (value: string, validity: ValidityState) => string;
  export type TagsInputFieldValidation = (values: string[], validity: ValidityState) => string;
  export type TagsInputFieldCountValidation = { value: number, message: string };

  const preset = "svs-tags-input-field";

  import { type Snippet, untrack } from "svelte";
  import { type SVSStyle, STATE, AREA, elemId, fnClass, isNeutral, omit } from "./core";
  import TagsInput, { type TagsInputProps, type TagsInputReqdProps, type TagsInputBindProps, type TagsInputDeps } from "./TagsInput.svelte";
</script>

<script lang="ts">
  let { label, extra, aux, left, right, bottom, descFirst = false, values = $bindable([]), min, max, constraints = [], validations = [], status = $bindable(""), style, element = $bindable(), deps }: TagsInputFieldProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(preset, style);
  const id = deps?.svsTagsInput?.attributes?.id ? deps.svsTagsInput.attributes.id : elemId.get(label?.trim());
  const idLabel = elemId.get(label?.trim());
  const idDesc = elemId.get(bottom?.trim());
  const idErr = idDesc ?? elemId.id;
  let message = $state(bottom);
  let value = $state("");
  if (max) constraints.unshift(() => values.length >= max.value ? max.message : "");
  if (min) validations.unshift(() => values.length < min.value ? min.message : "");

  // *** Initialize Deps *** //
  const svsBadge = {
    ...omit(deps?.svsBadge, "style"),
    style: deps?.svsBadge?.style ?? `${preset} svs-tags-input svs-badge`,
  };
  const svsTagsInput = {
    ...omit(deps?.svsTagsInput, "style", "attributes"),
    events: { onadd, onremove: deps?.svsTagsInput?.events?.onremove },
    style: deps?.svsTagsInput?.style ?? `${preset} svs-tags-input`,
    attributes: {
      ...omit(deps?.svsTagsInput?.attributes, "id", "onchange", "oninvalid", "aria-describedby"),
      id,
      onchange,
      oninvalid,
      "aria-describedby": idDesc,
    },
  };

  // *** Status *** //
  let neutral = isNeutral(status) ? status : STATE.DEFAULT;
  $effect(() => { neutral = isNeutral(status) ? status : neutral });
  let live = $derived(status === STATE.INACTIVE ? "alert" : "status");
  let idMsg = $derived(status === STATE.INACTIVE && message?.trim() ? idErr : undefined);
  function shift(oninvalid: boolean = false, msg?: string) {
    const vmsg = element?.validationMessage ?? "";
    status = getStatus(oninvalid, vmsg, msg);
    message = status === STATE.INACTIVE ? msg ? msg : vmsg ? vmsg : bottom : bottom;
  }
  function getStatus(oninvalid: boolean, vmsg: string, msg?: string): string {
    if (msg || (oninvalid && vmsg)) return STATE.INACTIVE;
    if (!values.length || vmsg) return neutral;
    return STATE.ACTIVE;
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
    status = neutral;
    shift(false, check());
    return status === STATE.INACTIVE;
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
    if (!isNeutral(status)) shift();
  }
  function oninvalid(ev: Event) {
    deps?.svsTagsInput?.attributes?.oninvalid?.(ev as any);
    ev.preventDefault();
    shift(true);
  }
  $effect(() => untrack(() => verify()));
</script>

<!---------------------------------------->

<div class={cls(AREA.WHOLE, status)} role="group" aria-labelledby={idLabel}>
  {#if aux}
    <div class={cls(AREA.TOP, status)}>
      {@render lbl()}
      <span class={cls(AREA.AUX, status)}>{@render aux(status, values, element)}</span>
    </div>
  {:else}
    {@render lbl()}
  {/if}
  {@render desc(descFirst)}
  <div class={cls(AREA.MIDDLE, status)}>
    {@render side(AREA.LEFT, left)}
    <TagsInput bind:values bind:value bind:status bind:element bind:ariaErrMsgId={idMsg} {...svsTagsInput} deps={{ svsBadge }} />
    {@render side(AREA.RIGHT, right)}
  </div>
  {@render desc(!descFirst)}
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
{#snippet side(area: string, body?: Snippet<[string, string[], HTMLInputElement | undefined]>)}
  {#if body}
    <span class={cls(area, status)}>{@render body(status, values, element)}</span>
  {/if}
{/snippet}
{#snippet desc(show: boolean)}
  {#if show && message?.trim()}
    <div class={cls(AREA.BOTTOM, status)} id={idDesc ?? idErr} role={live}>{message}</div>
  {/if}
{/snippet}

