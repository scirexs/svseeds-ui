<script module lang="ts">
</script>

<script lang="ts">
  let dt = $state(Temporal.Now.plainDateISO());

  function onclick() {
    dt = dt.add(Temporal.Duration.from({ days: 1 }));
  }
</script>

<button type="button" {onclick}>button</button>

<p>{dt.toString()}</p>
