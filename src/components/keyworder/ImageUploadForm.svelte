<script lang="ts">
  import Icon from "@iconify/svelte";
  import { type Image } from "@components/keyworder/types";

  let { images }: { images: Array<Image> } = $props();
  let files: FileList | null = $state(null);
  let disabled = $state(false);

  $effect(() => {
    if (!files) {
      return;
    }

    for (const file of files) {
      const newImage = {
        file,
        keywords: [],
        title: "",
        isLoading: true,
      };

      if (!images.find((image) => image.file.name === file.name)) {
        images.push(newImage);
        // generateKeywords(newImage.file);
      }
    }
  });

  const generateKeywords = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/describe/", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error generating keywords:", error);
    }
  };

  const describe = () => {
    disabled = true;
    for (const image of images) {
      generateKeywords(image.file);
    }
  };
</script>

<form class="my-4">
  <div class="flex flex-row gap-4">
    <label class="block max-w-fit">
      <div class="btn-regular rounded-lg active:scale-90 p-3 cursor-pointer grow">
        <Icon icon="material-symbols:upload" class="text-[1.50rem]"></Icon>
      </div>
      <!-- <span class="block text-75 text-sm font-medium mb-2">Upload images</span> -->
      <input name="files" id="files" type="file" accept="image/*" multiple bind:files class="hidden" />
    </label>
    {#if images.length > 0}
      <button
        class={`btn-regular rounded-lg active:scale-90 p-3 gap-1 ${disabled && "cursor-not-allowed"}`}
        type="button"
        onclick={describe}
        {disabled}
      >
        <span class="block leading-6 align-bottom">DESCRIBE</span>
        <Icon icon="material-symbols:send-rounded" class="text-[1.50rem]"></Icon>
      </button>
    {/if}
  </div>
</form>
{#if images.length > 0}
  <p class="text-75">
    The results will appear under the name of the image. You will see the status change once the image description is
    complete. Your images that will be sent to be described:
  </p>
  <ul class="text-75 list-disc list-inside divide-y-[1px]">
    {#each images as image (image.file.name)}
      <li class="truncate max-w-72 py-2">
        <span class="transition inline-block hover:scale-90">{image.file.name}</span>
      </li>
    {/each}
  </ul>
{/if}
