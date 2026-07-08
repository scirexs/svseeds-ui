<script lang="ts">
  import ToggleGroup, {
    _setToggleGroupContext,
    type ToggleGroupContext,
    type ToggleGroupEvents,
    type ToggleGroupProps,
    type ToggleOption,
  } from "#svs/ToggleGroup.svelte";
  import { type SVSClass, type SVSVariant } from "#svs/core";

  interface State {
    values: string[];
    variant: SVSVariant;
    ariaLabelId?: string;
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
    get ariaLabelId() {
      return state.ariaLabelId;
    },
    get ariaDescId() {
      return state.ariaDescId;
    },
    get ariaErrMsgId() {
      return state.ariaErrMsgId;
    },
    events: {
      onadd: (detail) => hooks?.events?.onadd?.(detail),
      onremove: (detail) => hooks?.events?.onremove?.(detail),
    },
  };
  _setToggleGroupContext(ctx);
</script>

<ToggleGroup {...input} />
