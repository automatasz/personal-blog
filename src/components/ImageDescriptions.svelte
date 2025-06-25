<script lang="ts">
  import type { Description } from "@utils/db";
  import { onMount } from "svelte";
  import { actions } from "astro:actions";
  import ImageWithLoading from "./ImageWithLoading.svelte";

  let { appId }: { appId: string } = $props();
  let descriptions: Description[] | undefined = $state(undefined);
  let batchId: string | null = $state(null);
  let attempts: number = $state(0);
  let errorMessage: string | undefined = $state(undefined);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    batchId = urlParams.get("id");
    if (batchId && uuidRegex.test(batchId)) {
      fetchBatch(batchId); // check if maybe it is already done, if not check if events are complete
    } else {
      errorMessage = "No valid batch ID provided";
    }
  });

  function fetchBatch(id: string) {
    actions.getBatch({ batchId: id }).then(({ error, data }) => {
      if (error) {
        errorMessage = error.message;
        throw error;
      }

      if (data.length > 0 && data.every((image) => image.title && image.description)) {
        descriptions = data;
      } else {
        fetchEventsComplete(id);
      }
    });
  }

  function fetchEventsComplete(id: string) {
    actions.checkEventComplete({ batchId: id }).then(({ data, error }) => {
      if (error) {
        errorMessage = error.message;
        throw error;
      }

      if (data.complete) {
        fetchBatch(id);
      } else if (attempts < 5) {
        setTimeout(() => fetchEventsComplete(id), 5000);
        attempts++;
      } else {
        const message =
          "Image descriptions do not exist under such ID or too many attempts have been made at retrieving descriptions, try again later";
        errorMessage = message;
        throw new Error(message);
      }
    });
  }
</script>

<section class="text-75 divide-y-2 space-y-4 mt-2">
  {#if errorMessage}
    <p class="text-red-600">Error when displaying image descriptions: {errorMessage}.</p>
  {:else if !descriptions}
    <p>Loading...</p>
  {/if}
  {#if descriptions}
    {#each descriptions as description (description.id)}
      <div class="grid lg:grid-cols-3 pt-4">
        <div class="p-1">
          <div class="group relative h-auto w-full overflow-hidden rounded-lg">
            <ImageWithLoading {description} {appId} />
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
  {/if}
</section>
