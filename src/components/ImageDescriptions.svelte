<script lang="ts">
  import type { Description } from "@utils/db";
  import { onMount } from "svelte";
  import { actions } from "astro:actions";
  // get props
  let { appId }: { appId: string } = $props();
  let batches: Description[] = $state([]);
  let batchId: string | null = $state(null);
  let attempts: number = $state(0);

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    batchId = urlParams.get("id");
    if (batchId) {
      fetchBatch(batchId); // check if maybe it is already done, if not check if events are complete
    }
  });

  function fetchBatch(id: string) {
    actions.getBatch({ batchId: id }).then((res) => {
      if (res.data) {
        batches = res.data;
      } else {
        fetchEventsComplete(id);
      }
      if (res.error) {
        throw res.error;
      }
    });
  }

  function fetchEventsComplete(id: string) {
    actions.checkEventComplete({ batchId: id }).then((res) => {
      if (res.data?.complete) {
        fetchBatch(id);
      } else if (attempts < 5) {
        setTimeout(() => fetchEventsComplete(id), 5000);
        attempts++;
      } else {
        throw new Error("events fetched too many attempts");
      }
      if (res.error) {
        throw res.error;
      }
    });
  }
</script>

<section class="text-75 divide-y-2 space-y-4">
  {#if batches.length === 0}
    <p>Loading...</p>
  {/if}
  {#each batches as description (description.id)}
    <div class="grid lg:grid-cols-3 pt-4">
      <div class="p-1">
        <div class="group relative h-auto w-full overflow-hidden rounded-lg">
          <img
            alt={description.title}
            src={`https://${appId}.ufs.sh/f/${description.file_id}`}
            class="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>
      <div class="lg:col-span-2 p-1">
        <h3 class="font-black text-xl">{description.title}</h3>
        <p class="text-sm text-50">file.png</p>
        <p class="my-2">{description.description}</p>
        <div class="flex gap-2 flex-wrap">
          {#if description.keywords}
            {#each description.keywords as keyword, index (index)}
              <span class="btn-regular h-8 text-sm px-3 rounded-lg">{keyword}</span>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/each}
</section>
