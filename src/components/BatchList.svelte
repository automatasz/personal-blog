<script lang="ts">
  import type { Description } from "@utils/db";
  import { onMount } from "svelte";
  import { actions } from "astro:actions";

  type DescriptionBatchId = Pick<Description, "batch_id"> & { created_at: string };
  let batches: DescriptionBatchId[] | undefined = $state(undefined);
  let errorMessage: string | undefined = $state(undefined);

  // onMount(() => {
  //   fetchBatches();
  // });

  function fetchBatches() {
    actions.getBatches().then(({ error, data }) => {
      if (error) {
        errorMessage = error.message;
        throw error;
      }

      batches = data.map((batch) => ({ batch_id: batch.batch_id, created_at: batch.created_at.toLocaleString() }));
    });
  }
</script>

<section class="text-75 space-y-4">
  {#if errorMessage}
    <p class="text-red-600">Error when displaying finished batches: {errorMessage}.</p>
  {:else if !batches}
    <p>Loading...</p>
  {/if}
  {#if batches}
    {#if batches.length === 0}
      <p>Once you upload some images, the results can be accessed from this page.</p>
    {:else}
      {#each batches as description (description.batch_id)}
        <div class="pt-4">
          <a class="transition link text-[var(--primary)] font-medium" href={`/batch?id=${description.batch_id}`}>
            {description.created_at.toLocaleString()}
          </a>
        </div>
      {/each}
    {/if}
  {/if}
</section>
