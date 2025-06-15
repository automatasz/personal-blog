<script lang="ts">
  import { type Image } from "@components/keyworder/types";
  let { images }: { images: Array<Image> } = $props();
</script>

<section class="table text-75">
  {#each images as image (image.file.name)}
    <div class="grid lg:grid-cols-3">
      <div class="p-1">
        <img src={image.objectUrl} alt={image.file.name} />
      </div>
      <div class="lg:col-span-2 p-1">
        {#if image.keywords}
          <h3 class="font-black text-xl">{image.title}</h3>
          <p class="text-sm text-50">{image.file.name}</p>
          <p class="my-2">{image.description}</p>
          <div class="flex gap-2 flex-wrap">
            {#each image.keywords as keyword, index (index)}
              <span class="btn-regular h-8 text-sm px-3 rounded-lg">{keyword}</span>
            {/each}
          </div>
        {:else}
          <div>Loading...</div>
        {/if}
      </div>
    </div>
  {/each}
</section>
