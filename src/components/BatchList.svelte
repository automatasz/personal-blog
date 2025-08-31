<script lang="ts">
  import type { Description } from "@utils/db";
  import { onMount } from "svelte";
  import { actions } from "astro:actions";
  import Icon from "@iconify/svelte";

  type DescriptionBatchId = Pick<Description, "batch_id" | "created_at">;
  let batches: DescriptionBatchId[] | undefined = $state(undefined);
  let errorMessage: string | undefined = $state(undefined);

  onMount(() => {
    fetchBatches();
  });

  function fetchBatches() {
    actions.getBatches().then(({ error, data }) => {
      if (error) {
        errorMessage = error.message;
        throw error;
      }

      batches = data;
    });
  }
</script>

<section class="text-75 space-y-4">
  <h3 class="font-black text-2xl text-90">Your previously created batches</h3>
  {#if errorMessage}
    <p class="text-red-600">Error when displaying finished batches: {errorMessage}.</p>
  {:else if !batches}
    <Icon class="text-[1.50rem]" icon="line-md:loading-loop" aria-label="loading" />
  {/if}
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    {#if batches}
      {#if batches.length === 0}
        <p>Once you upload some images, the results can be accessed from this page.</p>
      {:else}
        {#each batches as description (description.batch_id)}
          <div>
            <a class="transition link text-[var(--primary)] font-medium" href={`/batch?id=${description.batch_id}`}>
              {description.created_at.toLocaleString()}
            </a>
          </div>
        {/each}
      {/if}
    {/if}
  </div>
</section>
