<script lang="ts">
  let { text = "" }: { text?: string } = $props();
</script>

<span data-testid="dummy">{text}</span>
