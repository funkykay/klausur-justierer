<script lang="ts">
  export let errors: string[] | undefined = undefined;
</script>

{#if errors?.length}
  <div class="mt-1 space-y-1 text-xs font-medium text-red-700">
    {#each errors as error}
      <p>{error}</p>
    {/each}
  </div>
{/if}