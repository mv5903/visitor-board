<script lang="ts">
  import VisitorForm from './lib/VisitorForm.svelte';

  function handleVisitorSubmitted() {
    // Show success message or reload if needed
    console.log('Visitor submitted successfully!');
  }
</script>

<main class="min-h-screen bg-blue-900 flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <VisitorForm on:submitted={handleVisitorSubmitted} />
  </div>
</main>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #1e3a8a; /* blue-900 */
  }
</style>
