<script lang="ts">
  import type { Description } from "@utils/db";
  import { onMount } from "svelte";
  import { actions } from "astro:actions";
  import ImageWithLoading from "./ImageWithLoading.svelte";
  import Icon from "@iconify/svelte";

  let { appId }: { appId: string } = $props();
  let descriptions: Description[] | undefined = $state(undefined);
  let errorMessage: string | undefined = $state(undefined);

  onMount(() => {
    actions.getAllDescriptions().then(({ error, data }) => {
      if (error) {
        errorMessage = error.message;
        throw error;
      }

      if (data.length > 0) {
        descriptions = data;
      }
    });
  });
</script>

<section class="text-75 divide-y-2 space-y-4 mt-2">
  {#if errorMessage}
    <p class="text-red-600">Error when displaying image descriptions: {errorMessage}.</p>
  {:else if !descriptions}
    <Icon class="text-[1.50rem]" icon="line-md:loading-loop" aria-label="loading" />
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
          <p class="text-sm text-50">{description.file_name}</p>
          {#if description.result !== "success"}
            <p class="text-sm text-red-600">
              The image description failed. Please try again and make sure the image does not contain content that
              breaks the Terms of Service.
            </p>
          {/if}
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
