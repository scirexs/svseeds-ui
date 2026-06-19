<script lang="ts">
  import Toast, { type ToastItem, type Toaster } from "#svs/Toast.svelte";

  let { toaster, variant, motion }: { toaster: Toaster; variant?: string; motion?: number } = $props();
</script>

{#snippet children(item: ToastItem, effectiveVariant: string)}
  <div data-testid="toast-snippet-probe">
    {item.message}-{item.type}-{item.id}-{effectiveVariant}
  </div>
{/snippet}

<Toast {toaster} {children} {variant} {motion} />
