<script lang="ts">
  import { _getSortableContext } from "#svs/Sortable.svelte";

  const controller = _getSortableContext();
</script>

<output data-testid="motion-duration">{controller?.tp.duration}</output>
<output data-testid="motion-easing">{controller?.tp.easing(0.25)}</output>
