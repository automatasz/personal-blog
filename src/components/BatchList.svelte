<script lang="ts">
  import type { Description } from "@utils/db";
  import { onMount } from "svelte";
  import { actions } from "astro:actions";

  type DescriptionBatchId = Pick<Description, "batch_id" | "created_at">;
  let batches: DescriptionBatchId[] = $state([]);

  onMount(() => {
    fetchBatches();
  });

  function fetchBatches() {
    actions.getBatches().then((res) => {
      if (res.data) {
        batches = res.data;
      }
      if (res.error) {
        throw res.error;
      }
    });
  }
</script>

<section class="text-75 space-y-4">
  {#if batches.length === 0}
    <p>Loading...</p>
  {/if}
  {#each batches as description (description.batch_id)}
    <div class="pt-4">
      <a class="transition link text-[var(--primary)] font-medium" href={`/batch?id=${description.batch_id}`}>
        {description.created_at.toLocaleString()}
      </a>
    </div>
  {/each}
</section>
