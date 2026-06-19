<script lang="ts">
  import SortableGroup from "#svs/SortableGroup.svelte";
  import type { EasingFunction } from "svelte/transition";
  import SortableGroupMotionProbeChild from "./SortableGroupMotionProbeChild.svelte";

  let { duration, easing }: { duration?: number; easing?: EasingFunction } = $props();
</script>

<SortableGroup {duration} {easing}>
  <SortableGroupMotionProbeChild />
</SortableGroup>
