<script lang="ts">
  import ToggleGroup, {
    _setToggleGroupContext,
    type ToggleGroupContext,
    type ToggleGroupEvents,
    type ToggleGroupProps,
    type ToggleOption,
  } from "#svs/_ToggleGroup.svelte";
  import { type SVSClass, type SVSVariant } from "#svs/core";

  interface State {
    values: string[];
    variant: SVSVariant;
    ariaDescId?: string;
    ariaErrMsgId?: string;
    styling?: SVSClass;
    elements: HTMLButtonElement[];
  }
  interface Hooks {
    events?: ToggleGroupEvents;
  }
  interface Props {
    state: State;
    hooks?: Hooks;
    input?: ToggleGroupProps;
  }

  let { state, hooks, input = { options: new Map<string, string | ToggleOption>() } }: Props = $props();
  const ctx: ToggleGroupContext = {
    get values() {
      return state.values;
    },
    set values(v) {
      state.values = v;
    },
    set elements(v: HTMLButtonElement[]) {
      state.elements = v;
    },
    get variant() {
      return state.variant;
    },
    get styling() {
      return state.styling;
    },
    get ariaDescId() {
      return state.ariaDescId;
    },
    get ariaErrMsgId() {
      return state.ariaErrMsgId;
    },
    events: {
      onadd: (values, value) => hooks?.events?.onadd?.(values, value),
      onremove: (values, value, index) => hooks?.events?.onremove?.(values, value, index),
    },
  };
  _setToggleGroupContext(ctx);
</script>

<ToggleGroup {...input} />
