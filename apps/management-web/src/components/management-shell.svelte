<script lang="ts">
export let title: string
export let message: string
export let routePath: string
</script>

<main>
  <h1>{title}</h1>
  <p>{message}</p>
  <p class="meta">Route mirror: {routePath}</p>
</main>

<style>
  main {
    margin: 0 auto;
    max-width: 840px;
    padding: 3rem 1.25rem;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }

  p {
    line-height: 1.55;
  }

  .meta {
    margin-top: 1.25rem;
    color: #4c5d75;
    font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
  }
</style>
