<script lang="ts">
  import Icon from "@iconify/svelte";
  const {
    stats,
    error,
  }: { stats: { imageCount: number; batchCount: number; tokenSum: number } | undefined; error?: string } = $props();
</script>

<section class="text-75 space-y-4 mt-8 mb-12">
  <h3 class="font-black text-2xl text-90">So far, you've created:</h3>
  {#if error}
    <p class="text-red-600">Error when displaying finished batches: {error}.</p>
  {/if}
  {#if stats}
    <div class="inline-grid grid-flow-col rounded-2xl bg-[var(--float-panel-bg)] shadow">
      <div class="inline-grid w-full py-4 px-6">
        <div class="col-start-1 whitespace-nowrap">Batches created</div>
        <div class="col-start-1 whitespace-nowrap text-4xl font-extrabold">{stats.batchCount}</div>
        <div class="col-start-1 whitespace-nowrap text-xs text-50">Keep going!</div>
      </div>
      <div class="inline-grid w-full py-4 px-6">
        <div class="col-start-1 whitespace-nowrap">Images uploaded</div>
        <div class="col-start-1 whitespace-nowrap text-4xl font-extrabold">{stats.imageCount}</div>
      </div>
      <div class="inline-grid w-full py-4 px-6">
        <div class="col-start-1 whitespace-nowrap">Tokens used</div>
        <div class="col-start-1 whitespace-nowrap text-4xl font-extrabold">{stats.tokenSum}</div>
      </div>
    </div>
  {:else}
    <Icon class="text-[1.50rem]" icon="line-md:loading-loop" aria-label="loading" />
  {/if}
</section>
