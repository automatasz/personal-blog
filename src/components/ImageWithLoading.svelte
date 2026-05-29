<script lang="ts">
  import Icon from "@iconify/svelte";
  import type { Description } from "@utils/db";
  let {
    description,
    appId,
    src: externalSrc,
  }: {
    appId: string;
    description: Pick<Description, "file_id" | "title" | "width" | "height">;
    src?: string;
  } = $props();
  let loading = $state(true);
  let error = $state(false);

  const src = $derived(externalSrc ?? `https://${appId}.ufs.sh/f/${description.file_id}`);

  function completeLoading() {
    loading = false;
  }

  function showError() {
    loading = false;
    error = true;
  }
</script>

{#if error}
  <div
    class="w-full h-96 bg-black/10 z-10 text-white flex justify-center items-center"
  >
    <Icon class="text-[4rem]" icon="icon-park-outline:fail-picture" />
  </div>
{:else}
  <img
    alt={description.title}
    {src}
    class="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-110"
    loading="lazy"
    onload={completeLoading}
    onerror={showError}
    width={description.width}
    height={description.height}
  />
{/if}
{#if loading}
  <div
    class="absolute inset-0 w-full h-full bg-black/10 z-10 text-white flex justify-center items-center"
  >
    <Icon class="text-[4rem]" icon="line-md:downloading-loop" />
  </div>
{/if}
