<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ToggleProps extends Omit<HTMLButtonAttributes, "children" | "value" | "type" | "role" | "aria-pressed" | "aria-checked" | "aria-label"> {
    children?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    value?: boolean; // bindable (false)
    role?: "button" | "switch"; // ("button")
    ariaLabel?: string;
    attach?: Attachment<HTMLButtonElement>;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
    // other HTMLButtonAttributes are passed to <button> via ...rest; `class` is merged onto the button
  }
  ```
  For an icon-only or text-less toggle, provide `ariaLabel` so the button has an accessible name.
  ### Anatomy
  ```svelte
  <span class="whole" conditional>
    <span class="left" conditional>{left}</span>
    <button class="main" {...rest} {role} aria-pressed aria-label>
      {children} conditional
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
    children?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    left?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[boolean, string, HTMLButtonElement | undefined]>; // Snippet<[value,variant,element]>
    value?: boolean; // bindable (false)
    role?: "button" | "switch"; // ("button")
    ariaLabel?: string;
    attach?: Attachment<HTMLButtonElement>;
    element?: HTMLButtonElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // bindable (VARIANT.NEUTRAL)
  }
  export type ToggleReqdProps = never;
  export type ToggleBindProps = "value" | "variant" | "element";

  export const _TOGGLE_PRESET = "svs-toggle";

  import { untrack } from "svelte";
  import { VARIANT, PARTS, fnClass, isNeutral } from "./core";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { HTMLButtonAttributes, MouseEventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, left, right, value = $bindable(false), role = "button", ariaLabel, onclick, attach, element = $bindable(), styling, variant = $bindable(VARIANT.NEUTRAL), class: c, ...rest }: ToggleProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(_TOGGLE_PRESET, styling));
  // Remembers the latest neutral (off-state) variant so OFF restores a caller custom neutral.
  let neutral = isNeutral(variant) ? variant : VARIANT.NEUTRAL;
  let state = $derived(
    role === "button" ? { "aria-pressed": value, "aria-checked": undefined } : { "aria-checked": value, "aria-pressed": undefined },
  );

  // *** Reactive Handlers *** //
  // Track runtime changes to a custom neutral variant (ignore ACTIVE/INACTIVE).
  $effect(() => {
    neutral = isNeutral(variant) ? variant : neutral;
  });
  // Drive variant from value: ON -> ACTIVE, OFF -> remembered neutral.
  $effect.pre(() => {
    value;
    untrack(() => toggle());
  });
  function toggle() {
    variant = value ? VARIANT.ACTIVE : neutral;
  }

  // *** Event Handlers *** //
  const hclick: MouseEventHandler<HTMLButtonElement> = (ev) => {
    value = !value;
    onclick?.(ev);
  };
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
    {#if children}{@render children(value, variant, element)}{/if}
  </button>
{/snippet}
