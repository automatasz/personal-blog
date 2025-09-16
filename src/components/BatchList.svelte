<script lang="ts">
  import type { Description } from "@utils/db";
  import { onMount } from "svelte";
  import { actions } from "astro:actions";
  import Icon from "@iconify/svelte";
  import { daysAgo, daysAgoWord, getTime } from "@utils/date-utils";

  type DescriptionBatchId = Pick<Description, "batch_id" | "created_at"> & { number_of_images: number };
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
  <h3 class="font-black text-2xl text-90">Batches created so far</h3>
  {#if errorMessage}
    <p class="text-red-600">Error when displaying finished batches: {errorMessage}.</p>
  {:else if !batches}
    <Icon class="text-[1.50rem]" icon="line-md:loading-loop" aria-label="loading" />
  {/if}
  <ul class="list-none space-y-2">
    {#if batches}
      {#if batches.length === 0}
        <p>Once you upload some images, the results can be accessed from this page.</p>
      {:else}
        {#each batches as description (description.batch_id)}
          <a
            href={`/batch?id=${description.batch_id}`}
            class="group cursor-pointer p-4 flex flex-row gap-4 justify-between items-center hover:bg-[var(--btn-plain-bg-hover)] transition ease-in-out duration-300 rounded-lg space-y-1"
          >
            <div>
              <div class="text-lg text-75 font-extrabold">
                {description.number_of_images}
                {description.number_of_images > 1 ? "images" : "image"}
              </div>
              <div class="text-sm text-50">
                {daysAgoWord(daysAgo(description.created_at))}
                {getTime(description.created_at)}
              </div>
            </div>
            <div>
              <Icon
                class="text-[1.50rem] group-hover:text-50 transition ease-in-out duration-300"
                icon="solar:play-bold"
              />
            </div>
          </a>
        {/each}
      {/if}
    {/if}
  </ul>
</section>
