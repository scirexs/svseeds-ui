<script module lang="ts">
  import type { DateInputProps } from "#svs/DateInput.svelte";
  import type { SVSClass, SVSVariant } from "#svs/core";

  interface State {
    value: Temporal.PlainDate | undefined;
    variant: SVSVariant;
    element: HTMLInputElement | undefined;
    ariaErrMsgId: string | undefined;
    styling: SVSClass | undefined;
    id: string | undefined;
    describedby: string | undefined;
  }
  interface Hooks {
    onchange?: (ev: Event) => void;
    oninvalid?: (ev: Event) => void;
  }
  interface Props {
    state: State;
    hooks?: Hooks;
    input?: DateInputProps;
  }
</script>

<script lang="ts">
  import DateInput, { _setDateInputContext, type DateInputContext } from "#svs/DateInput.svelte";

  let { state, hooks, input = {} }: Props = $props();
  const ctx: DateInputContext = {
    get value() {
      return state.value;
    },
    set value(v) {
      state.value = v;
    },
    get variant() {
      return state.variant;
    },
    get styling() {
      return state.styling;
    },
    set element(v: HTMLInputElement | undefined) {
      state.element = v;
    },
    get ariaErrMsgId() {
      return state.ariaErrMsgId;
    },
    get id() {
      return state.id;
    },
    get describedby() {
      return state.describedby;
    },
    onchange: (ev) => hooks?.onchange?.(ev),
    oninvalid: (ev) => hooks?.oninvalid?.(ev),
  };
  _setDateInputContext(ctx);
</script>

<DateInput {...input} />
