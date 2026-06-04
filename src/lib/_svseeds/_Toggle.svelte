<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ToggleProps extends Omit<HTMLButtonAttributes, "children" | "value" | "type" | "role" | "aria-pressed" | "aria-checked" | "aria-label"> {
    children: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    value?: boolean; // bindable (false)
    role?: "button" | "switch"; // ("button")
    ariaLabel?: string;
    attach?: Attachment;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // other HTMLButtonAttributes are passed to <button> via ...rest; `class` is merged onto the button
  }
  ```
  ### Anatomy
  ```svelte
  <span class="whole" conditional>
    <span class="left" conditional>{left}</span>
    <button class={["main", class]} aria-pressed={value} aria-label={ariaLabel} {role} {...rest} bind:this={element} {@attach attach}>
      {children}
    </button>
    <span class="right" conditional>{right}</span>
  </span>
  ```
-->
<script module lang="ts">
  export interface ToggleProps extends Omit<
    HTMLButtonAttributes,
    "children" | "value" | "type" | "role" | "aria-pressed" | "aria-checked" | "aria-label"
  > {
    children: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    value?: boolean; // bindable (false)
    role?: "button" | "switch"; // ("button")
    ariaLabel?: string;
    attach?: Attachment;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
  }
  export type ToggleReqdProps = "children";
  export type ToggleBindProps = "value" | "variant" | "element";

  const preset = "svs-toggle";

  import { type Snippet, untrack } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type HTMLButtonAttributes } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isNeutral } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, left, right, value = $bindable(false), role = "button", ariaLabel, onclick, attach, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), class: c, ...rest }: ToggleProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  let state = $derived(
    role === "button" ? { "aria-pressed": value, "aria-checked": undefined } : { "aria-checked": value, "aria-pressed": undefined },
  );

  // *** Bind Handlers *** //
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  $effect.pre(() => {
    value;
    untrack(() => toggle());
  });
  function toggle() {
    variant = value ? VARIANT.ACTIVE : neutral;
  }

  // *** Event Handlers *** //
  function hclick(ev: MouseEvent) {
    value = !value;
    onclick?.(ev as any);
  }
</script>

<!---------------------------------------->

{#if left || right}
  <span class={cls(PARTS.WHOLE, variant)} role="group">
    {@render side(PARTS.LEFT, left)}
    {@render button()}
    {@render side(PARTS.RIGHT, right)}
  </span>
{:else}
  {@render button()}
{/if}

{#snippet side(area: string, body?: Snippet<[boolean, string, HTMLButtonElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(value, variant, element)}</span>
  {/if}
{/snippet}
{#snippet button()}
  {@const r = role === "button" ? undefined : role}
  <button
    bind:this={element}
    class={[cls(PARTS.MAIN, variant), c]}
    aria-label={ariaLabel}
    onclick={hclick}
    {...rest}
    type="button"
    role={r}
    {...state}
    {@attach attach}
  >
    {@render children(value, variant, element)}
  </button>
{/snippet}
