<script lang="ts">
  import Icon from "@iconify/svelte";
  import { type Image } from "@components/keyworder/types";
  import type { z } from "zod";
  import { descriptionSchema } from "@/inngest/types";
  import { onDestroy } from "svelte";
  import ImageDisplay from "./ImageDisplay.svelte";

  type Run = { data: Array<{ status: string; output?: z.infer<typeof descriptionSchema> } & Record<string, unknown>> };

  let images: Array<Image> = $state([]);
  let files: FileList | null = $state(null);
  let disabled = $state(false);
  let anyImagesLoading = $derived(images.some((image) => image.isLoading));

  $effect(() => {
    if (!files) {
      return;
    }

    for (const file of files) {
      const newImage = {
        file,
        isLoading: true,
        objectUrl: URL.createObjectURL(file),
      };

      if (!images.find((image) => image.file.name === file.name)) {
        images.push(newImage);
      }
    }
  });

  const generateKeywords = async (image: Image) => {
    try {
      const formData = new FormData();
      formData.append("file", image.file);

      const response = await fetch("/api/describe/", {
        method: "POST",
        body: formData,
      });

      const data: { id?: string } = await response.json();

      if (data.id) {
        setTimeout(() => {
          getRunOutput(data.id as string).then((result) => {
            image.description = result.output?.description;
            image.title = result.output?.title;
            image.keywords = result.output?.keywords;
            image.isLoading = false;
          });
        }, 10000); // delay polling by 10s
      } else {
        // TODO: show an error
      }
    } catch (error) {
      console.error("Error generating keywords:", error);
    }
  };

  const describe = () => {
    disabled = true;
    for (const image of images) {
      generateKeywords(image);
    }
  };

  const getRuns = async (eventId: string) => {
    const response = await fetch(`/api/run/${eventId}`);
    const result: Run = await response.json();
    return result.data;
  };

  const getRunOutput = async (eventId: string) => {
    let runs = await getRuns(eventId);
    while (runs?.[0]?.status !== "Completed") {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5s
      runs = await getRuns(eventId);
      console.log("runs", runs);
      if (runs?.[0]?.status === "Failed" || runs?.[0]?.status === "Cancelled") {
        throw new Error(`Function run ${runs?.[0]?.status}`);
      }
    }
    return runs[0];
  };

  onDestroy(() => {
    images.forEach((image) => {
      URL.revokeObjectURL(image.objectUrl);
    });
  });
</script>

<form class="my-4">
  <div class="flex flex-row gap-4">
    <label class="block max-w-fit">
      <div class="btn-regular rounded-lg active:scale-90 p-3 cursor-pointer grow">
        <Icon icon="material-symbols:upload" class="text-[1.50rem]"></Icon>
      </div>
      <input name="files" id="files" type="file" accept="image/*" multiple bind:files class="hidden" />
    </label>
  </div>
</form>

{#if images.length > 0 && !disabled && anyImagesLoading}
  <p class="text-75">Your images that will be sent to be described:</p>
  <ul class="text-75 list-disc list-inside divide-y-[1px]">
    {#each images as image (image.file.name)}
      <li class="truncate w-72 py-2">
        <span>{image.file.name}</span>
      </li>
    {/each}
  </ul>

  <button class="btn-regular rounded-lg active:scale-90 p-3 gap-1" type="button" onclick={describe}>
    <span class="block leading-6 align-bottom">DESCRIBE</span>
    <Icon icon="material-symbols:send-rounded" class="text-[1.50rem]"></Icon>
  </button>
{/if}
{#if images.length > 0 && disabled && anyImagesLoading}
  <p class="text-75">Loading...</p>
{/if}
{#if images.length > 0 && !anyImagesLoading}
  <ImageDisplay {images} />
{/if}
