<script module lang="ts">
  import CheckField, { type CheckFieldProps } from "#svs/CheckField.svelte";

  interface Props extends Omit<CheckFieldProps, "values" | "elements"> {
    initialValues?: string[];
  }

  const seed = <T,>(value: T) => value;
</script>

<script lang="ts">
  // prettier-ignore
  let { initialValues = [], ...rest }: Props = $props();
  // svelte-ignore state_referenced_locally
  let values = $state(seed(initialValues));
  let elements = $state<HTMLInputElement[]>([]);
</script>

<CheckField bind:values bind:elements {...rest as any} />
<output data-testid="values">{values.join(",")}</output>
<output data-testid="elements">{elements.length}</output>
