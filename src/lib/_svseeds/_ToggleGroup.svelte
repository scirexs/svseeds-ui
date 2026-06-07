<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ToggleOption extends Omit<HTMLButtonAttributes, "class" | "type" | "role" | "aria-checked" | "aria-invalid" | "aria-errormessage" | "onclick"> {
    text: string;
  }
  interface ToggleGroupProps {
    options: SvelteMap<string, string | ToggleOption> | Map<string, string | ToggleOption>;
    children?: Snippet<[string, string, string]>; // Snippet<[value,text,variant]>
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    ariaDescId?: string;
    ariaErrMsgId?: string; // bindable
    attach?: Attachment;
    elements?: HTMLButtonElement[]; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  ```
  ### Anatomy
  ```svelte
  <span class="whole" aria-describedby={ariaDescId} aria-errormessage={ariaErrMsgId}>
    {#each options as { value, text, disabled, ...attrs }}
      <button {...attrs} class="main" disabled={disabled || undefined} {@attach attach}>
        {text} or {children}
      </button>
    {/each}
  </span>
  ```
-->
<script module lang="ts">
  export interface ToggleOption extends Omit<
    HTMLButtonAttributes,
    "class" | "type" | "role" | "aria-checked" | "aria-invalid" | "aria-errormessage" | "onclick"
  > {
    text: string;
  }
  export interface ToggleGroupProps {
    options: SvelteMap<string, string | ToggleOption> | Map<string, string | ToggleOption>;
    children?: Snippet<[string, string, string]>; // Snippet<[value,text,variant]>
    values?: string[]; // bindable
    multiple?: boolean; // (true)
    ariaDescId?: string;
    ariaErrMsgId?: string; // bindable
    attach?: Attachment;
    elements?: HTMLButtonElement[]; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type ToggleGroupReqdProps = "options";
  export type ToggleGroupBindProps = "values" | "elements";

  const preset = "svs-toggle-group";

  import { type Snippet } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type HTMLButtonAttributes } from "svelte/elements";
  import { type SvelteMap } from "svelte/reactivity";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { options, children, values = $bindable([]), multiple = true, ariaDescId, ariaErrMsgId, attach, elements = $bindable([]), styling, variant = VARIANT.NEUTRAL }: ToggleGroupProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const role = $derived(multiple ? "checkbox" : "radio");
  const roleGroup = $derived(multiple ? "group" : "radiogroup");

  // *** Bind Handlers *** //
  let opts = $derived(
    [...options].map(([value, def]) => {
      const { text, disabled, ...attrs } = typeof def === "string" ? { text: def } : def;
      return { value, text, disabled: disabled ?? false, attrs, checked: values.includes(value) };
    }),
  );
  let invalid = $derived(ariaErrMsgId ? true : undefined);
  let activeIndex = $derived.by(() => {
    if (multiple) return -1;
    const checked = opts.findIndex((o) => o.checked && !o.disabled);
    if (checked >= 0) return checked;
    return opts.findIndex((o) => !o.disabled);
  });
  $effect(() => {
    if (!multiple && values.length > 1) values = values.slice(0, 1);
  });

  // *** Event Handlers *** //
  const update = $derived(
    multiple
      ? (value: string) => {
          const set = new Set(values);
          set.has(value) ? set.delete(value) : set.add(value);
          return opts.filter((o) => set.has(o.value)).map((o) => o.value);
        }
      : (value: string) => (values.includes(value) ? [] : [value]),
  );
  function updateValues(value: string): () => void {
    return () => {
      if (opts.find((o) => o.value === value)?.disabled) return;
      values = update(value);
    };
  }
  function nextEnabledIndex(start: number, step: 1 | -1): number {
    if (!opts.some((o) => !o.disabled)) return -1;
    for (let offset = 1; offset <= opts.length; offset += 1) {
      const index = (start + step * offset + opts.length) % opts.length;
      if (!opts[index].disabled) return index;
    }
    return -1;
  }
  function edgeEnabledIndex(edge: "first" | "last"): number {
    if (edge === "first") return opts.findIndex((o) => !o.disabled);
    for (let i = opts.length - 1; i >= 0; i -= 1) {
      if (!opts[i].disabled) return i;
    }
    return -1;
  }
  function targetIndex(key: string, index: number): number {
    if (key === "Home") return edgeEnabledIndex("first");
    if (key === "End") return edgeEnabledIndex("last");
    if (key === "ArrowRight" || key === "ArrowDown") return nextEnabledIndex(index, 1);
    if (key === "ArrowLeft" || key === "ArrowUp") return nextEnabledIndex(index, -1);
    return -1;
  }
  function moveFocus(index: number, ev: KeyboardEvent) {
    if (multiple) return;
    const target = targetIndex(ev.key, index);
    if (target < 0) return;
    ev.preventDefault();
    elements[target]?.focus();
    values = [opts[target].value];
  }
</script>

<!---------------------------------------->

{#if opts.length}
  <span
    class={cls(PARTS.WHOLE, variant)}
    role={roleGroup}
    aria-describedby={ariaDescId}
    aria-invalid={invalid}
    aria-errormessage={ariaErrMsgId}
  >
    {#each opts as { value, text, disabled, attrs, checked }, i (value)}
      {@const v = checked ? VARIANT.ACTIVE : variant}
      {@const c = cls(PARTS.MAIN, v)}
      <button
        {...attrs}
        bind:this={elements[i]}
        class={c}
        type="button"
        {role}
        aria-checked={checked}
        disabled={disabled || undefined}
        aria-invalid={undefined}
        aria-errormessage={undefined}
        tabindex={!multiple ? (i === activeIndex ? 0 : -1) : undefined}
        onclick={updateValues(value)}
        onkeydown={(ev) => moveFocus(i, ev)}
        {@attach attach}
      >
        {@render content(value, text, v)}
      </button>
    {/each}
  </span>
{/if}

{#snippet content(value: string, text: string, variant: string)}
  {#if children}
    {@render children(value, text, variant)}
  {:else}
    {text}
  {/if}
{/snippet}
