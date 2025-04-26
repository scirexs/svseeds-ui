<script module lang="ts">
  export type TagsInputProps = {
    values?: string[], // bindable
    type?: "left" | "right" | "bottom", // <"left">
    confirm?: string[], // <["Enter"]>
    trim?: boolean, // <true>
    unique?: boolean, // <true>
    min?: TagCountValidation,
    max?: TagCountValidation,
    validations?: ((values: string[]) => string)[],
    status?: string, // bindable <STATE.DEFAULT>
    style?: SVSStyle,
    element?: HTMLInputElement, // bindable
    deps?: TagsInputDeps,
  };
  export type TagsInputDeps = {
    svsTextField?: Omit<TextFieldProps, TextFieldReqdProps | TextFieldBindProps>,
    svsBadge?: Omit<BadgeProps, BadgeReqdProps | BadgeBindProps | "type" | "href">,
  };
  export type TagsInputReqdProps = never;
  export type TagsInputBindProps = "dark" | "status" | "element";
  export type TagCountValidation = { value: number, message: string };

  const preset = "svs-tags-input";
  const CONFIRM_KEY = "Enter";

  import { untrack } from "svelte";
  import { type SVSStyle, STATE, AREA, fnClass, omit } from "./core";
  import TextField, { type TextFieldProps, type TextFieldReqdProps, type TextFieldBindProps } from "./_TextField.svelte";
  import Badge, { type BadgeProps, type BadgeReqdProps, type BadgeBindProps } from "./_Badge.svelte";
</script>

<script lang="ts">
  let { values = $bindable([]), type = "left", confirm = [], trim = true, unique = true, min, max, validations = [], status = $bindable(""), style, element = $bindable(), deps }: TagsInputProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(preset, style);
  const confirmKeys = new Set([CONFIRM_KEY, ...confirm]);
  if (min) validations.push((values) => values.length < min.value ? min.message : "");
  const left = type === "left" || deps?.svsTextField?.left ? sideLeft : undefined;
  const right = type === "right" || deps?.svsTextField?.right ? sideRight : undefined;
  let value = $state("");

  // *** Initialize Deps *** //
  const svsBadge = {
    ...omit(deps?.svsBadge, "onclick", "right", "style"),
    style: deps?.svsBadge?.style ?? `${preset} svs-badge`,
  };
  const textValidations = deps?.svsTextField?.validations ?? [];
  if (max) textValidations.push((_) => values.length >= max.value ? max.message : "");
  const svsTextField = {
    ...omit(deps?.svsTextField, "validations", "style", "attributes"),
    validations: textValidations,
    style: deps?.svsTextField?.style ?? `${preset} svs-text-field`,
    attributes: { ...deps?.svsTextField?.attributes, onkeydown },
  };

  // *** Bind Handlers *** //
  $effect.pre(() => {
    values;
    untrack(() => validate());
  });
  function validate() {
    for (const v of validations) {
      const msg = v(values);
      if (msg) return element?.setCustomValidity(msg);
    }
  }

  // *** Event Handlers *** //
  const change = new Event("change", { bubbles: true, cancelable: true });
  function onkeydown(ev: KeyboardEvent) {
    deps?.svsTextField?.attributes?.onkeydown?.(ev as any);
    if (!confirmKeys.has(ev.key) || ev.isComposing) return;
    ev.preventDefault();
    element?.dispatchEvent(change);
    if (status === STATE.INACTIVE) return;
    addTag();
  }
  function addTag() {
    if (unique && values.includes(value)) value = "";
    if (trim) value = value.trim();
    if (!value) return;
    values.push(value);
    value = "";
  }
  function removeTag(index: number): (ev: Event) => void {
    return (ev) => {
      deps?.svsBadge?.onclick?.(ev as any);
      values.splice(index, 1);
    };
  }
  $effect(() => untrack(() => validate()))
</script>

<!---------------------------------------->

<TextField bind:value bind:status bind:element type="text" {left} {right} {...svsTextField} />
{#if type === "bottom"}
  <div class={cls(AREA.BOTTOM, status)}>
    {@render tags()}
  </div>
{/if}

{#snippet sideLeft(status: string)}
  {#if type === "left"}
    {@render tags()}
  {:else}
    {#if deps?.svsTextField?.left}
      {@render deps.svsTextField.left(status, "", element)}
    {/if}
  {/if}
{/snippet}
{#snippet sideRight(status: string)}
  {#if type === "right"}
    {@render tags()}
  {:else}
    {#if deps?.svsTextField?.right}
      {@render deps.svsTextField.right(status, "", element)}
    {/if}
  {/if}
{/snippet}
{#snippet tags()}
  {#each values as value, i}
    <Badge type="right" onclick={removeTag(i)} {...svsBadge}>
      {#snippet right(status)}
        {#if deps?.svsBadge?.right}
          {@render deps.svsBadge.right(status)}
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="min-width: 5px; min-height: 5px;"><path d="M511.998 70.682 441.315 0 256.002 185.313 70.685 0 .002 70.692l185.314 185.314L.002 441.318 70.69 512l185.312-185.312L441.315 512l70.683-70.682-185.314-185.312z" /></svg>
        {/if}
      {/snippet}
      {value}
    </Badge>
  {/each}
{/snippet}
