<!--
  @component
  ### Usage
  Use standalone, or inside `Pagination`.
  ```svelte
  <ComboBox {...props} />

  <Pagination>
    <ComboBox {...props} />
  </Pagination>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface ComboBoxProps extends Omit<HTMLInputAttributes, "type" | "value" | "list" | "role" | "aria-haspopup" | "aria-autocomplete" | "aria-controls" | "aria-expanded" | "aria-activedescendant"> {
    options?: SvelteSet<string> | Set<string>;
    extra?: Snippet<[boolean, string]>; // Snippet<[expanded,variant]>
    value?: string; // bindable
    expanded?: boolean; // bindable
    search?: boolean // (true)
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // class & other HTMLInputAttributes are passed to <input> via ...rest (class is merged onto the control)
  }
  ```
  ### Anatomy
  ```svelte
  <span class="whole">
    <input class="main" {...rest} type="text" />
    <div class="extra" conditional>{extra}</div>
    <ul class="bottom">
      {#each options as option}
        <li class="label">{option}</li>
      {/each}
    </ul>
  </span>
  ```
  ### Behavior
  - When embedded in a `ComboBoxContext`, `options`, `value`, `variant`, and fallback `styling` come from the context.
  - Closing the listbox invokes the context's `commit` hook when present.
  Open/close animations should be layered on the `bottom` part variant classes (`active` = open) with opacity, transform, or scale; the component keeps `visibility` as its structural default.
-->
<script module lang="ts">
  export interface ComboBoxProps extends Omit<
    HTMLInputAttributes,
    "type" | "value" | "list" | "role" | "aria-haspopup" | "aria-autocomplete" | "aria-controls" | "aria-expanded" | "aria-activedescendant"
  > {
    options?: SvelteSet<string> | Set<string>;
    extra?: Snippet<[boolean, string]>; // Snippet<[expanded,variant]>
    value?: string; // bindable
    expanded?: boolean; // bindable
    search?: boolean; // (true)
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type ComboBoxReqdProps = never;
  export type ComboBoxBindProps = "value" | "expanded" | "element";

  export const _COMBO_BOX_PRESET = "svs-combo-box";
  const NA = -1;

  export interface ComboBoxContext extends SVSContext {
    get options(): SvelteSet<string> | Set<string>;
    get value(): string;
    set value(v: string);
    commit?(): void;
  }
  export const [_getComboBoxContext, _setComboBoxContext] = _createContext<ComboBoxContext>();

  import { tick } from "svelte";
  import { VARIANT, PARTS, _detectOverflow, _fnClass, _createContext } from "./_core";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { SvelteSet } from "svelte/reactivity";
  import type {
    HTMLInputAttributes,
    EventHandler,
    FormEventHandler,
    KeyboardEventHandler,
    FocusEventHandler,
    MouseEventHandler,
  } from "svelte/elements";
  import type { SVSClass, SVSVariant, SVSContext } from "./_core";
</script>

<script lang="ts">
  // prettier-ignore
  let { options, extra, value = $bindable(""), expanded = $bindable(false), search = true, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, onclick, onkeydown, oninput, onfocus, onblur, ...rest }: ComboBoxProps = $props();
  const ctx = _getComboBoxContext();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_COMBO_BOX_PRESET, styling ?? ctx?.styling));
  const uid = $props.id();
  const idList = `${uid}-list`;
  const effOptions = $derived(ctx ? ctx.options : options);
  const effValue = $derived(ctx ? ctx.value : value);
  const effVariant = $derived(ctx ? ctx.variant : variant);
  let selected = $state(NA);
  let typed = $state(false);
  let wasExpanded = expanded;
  let overflow = $state({ x: false, y: false });
  let listElem = $state<HTMLUListElement>();
  function setValue(v: string) {
    if (ctx) ctx.value = v;
    else value = v;
  }

  // *** Reactive Handlers *** //
  const listboxStyle = $derived(
    `position:absolute;cursor:default;user-select:none;visibility: ${expanded ? "visible" : "hidden"};${overflow.x ? "right:0%;" : ""}${overflow.y ? "bottom:100%;" : ""}`,
  );
  const opts = $derived(effOptions ? [...effOptions.keys()] : []);
  const view = $derived(search && typed && effValue ? opts.filter((x) => x.toLowerCase().startsWith(effValue.toLowerCase())) : opts);

  $effect.pre(() => {
    if (wasExpanded && !expanded) {
      selected = NA;
      typed = false;
    }
    wasExpanded = expanded;
  });
  $effect(() => {
    if (!expanded || selected <= NA || !listElem) return;
    listElem.children[selected]?.scrollIntoView?.({ block: "nearest" });
  });

  // *** Event Handlers *** //
  function open(activate: boolean = false, bottom: boolean = false) {
    if (expanded) return;
    typed = false;
    selected = view.indexOf(effValue);
    if (activate && selected === NA) selected = bottom ? view.length - 1 : 0;
    expanded = true;
    observeOverflow();
  }
  async function observeOverflow() {
    overflow = { x: false, y: false };
    await tick();
    if (!listElem || typeof window === "undefined") return;
    overflow = _detectOverflow(listElem);
  }
  function apply() {
    if (!expanded) return;
    if (selected === NA || selected >= view.length) return;
    const v = view[selected];
    setValue(v);
    if (element) element.selectionStart = v.length;
    close();
  }
  function close() {
    expanded = false;
    selected = NA;
    typed = false;
    if (ctx) ctx.commit?.();
  }
  const hfocus: FocusEventHandler<HTMLInputElement> = (ev) => {
    onfocus?.(ev);
    open();
  };
  const hblur: FocusEventHandler<HTMLInputElement> = (ev) => {
    onblur?.(ev);
    close();
  };
  const hclick: MouseEventHandler<HTMLInputElement> = (ev) => {
    onclick?.(ev);
    if (!expanded) open();
  };
  const hinput: FormEventHandler<HTMLInputElement> = (ev) => {
    oninput?.(ev);
    if ((ev as Parameters<EventHandler<InputEvent, HTMLInputElement>>[0]).isComposing) return;
    typed = true;
    selected = effOptions?.has(effValue) ? view.indexOf(effValue) : NA;
  };
  const hkeydown: KeyboardEventHandler<HTMLInputElement> = (ev) => {
    onkeydown?.(ev);
    if (ev.isComposing) return;
    if (ev.ctrlKey || ev.shiftKey || ev.metaKey) return;
    switch (ev.key) {
      case "Escape":
        if (!ev.altKey && expanded) close();
        break;
      case "Enter":
        if (!ev.altKey && expanded && selected > NA) {
          ev.preventDefault();
          apply();
        }
        if (!ev.altKey && expanded && selected === NA && ctx) {
          ev.preventDefault();
          close();
        }
        break;
      case "ArrowDown":
        caseArrowDown(ev, ev.altKey);
        break;
      case "ArrowUp":
        caseArrowUp(ev, ev.altKey);
        break;
    }
  };
  function caseArrowDown(ev: KeyboardEvent, alt: boolean) {
    if (alt && expanded) return;
    ev.preventDefault();
    if (alt && !expanded) return open();
    if (!alt && !expanded) return open(true);
    if (!view.length) return (selected = NA);
    if (selected < view.length - 1) selected++;
  }
  function caseArrowUp(ev: KeyboardEvent, alt: boolean) {
    if (alt && !expanded) return;
    ev.preventDefault();
    if (alt && expanded) return close();
    if (!alt && !expanded) return open(true, true);
    if (!view.length) return (selected = NA);
    if (selected > 0) selected--;
    if (selected === NA) selected = view.length - 1;
  }
</script>

<!---------------------------------------->
<svelte:document onscroll={() => close()} />

{#if effOptions?.size}
  <span class={cls(PARTS.WHOLE, effVariant)} style="position:relative;">
    <input
      bind:value={() => effValue, setValue}
      bind:this={element}
      class={[cls(PARTS.MAIN, effVariant), c]}
      {...rest}
      type="text"
      role="combobox"
      aria-haspopup="listbox"
      aria-autocomplete="list"
      aria-controls={idList}
      aria-expanded={expanded}
      aria-activedescendant={selected > NA ? `${idList}-${selected}` : undefined}
      onfocus={hfocus}
      onblur={hblur}
      onclick={hclick}
      onkeydown={hkeydown}
      oninput={hinput}
      {@attach attach}
    />
    {#if extra}
      <div class={cls(PARTS.EXTRA, effVariant)} style="position:absolute;top:50%;right:0%;transform:translateY(-50%);pointer-events:none;">
        {@render extra(expanded, effVariant)}
      </div>
    {/if}
    <ul
      bind:this={listElem}
      class={cls(PARTS.BOTTOM, expanded ? VARIANT.ACTIVE : effVariant)}
      id={idList}
      role="listbox"
      style={listboxStyle}
    >
      {#each view as opt, i (opt)}
        {@const isSelected = i === selected}
        {@const labelStatus = isSelected ? VARIANT.ACTIVE : effVariant}
        {@const onpointerenter = () => (selected = i)}
        <li
          id={`${idList}-${i}`}
          class={cls(PARTS.LABEL, labelStatus)}
          aria-selected={isSelected}
          role="option"
          onpointerdown={apply}
          {onpointerenter}
        >
          {opt}
        </li>
      {/each}
    </ul>
  </span>
{/if}
