<script lang="ts">
  import Icon from "@iconify/svelte";
  import { onDestroy, untrack } from "svelte";
  import { fade } from "svelte/transition";
  import { actions } from "astro:actions";
  import { navigate } from "astro:transitions/client";

  interface Image {
    file: File;
    objectUrl: string;
    isDelete: boolean;
  }

  let files: FileList | null = $state(null);
  let images: Image[] = $state([]);
  let isSubmitting: boolean = $state(false);

  $effect(() => {
    const imageArray = updateImagesArray(
      files,
      untrack(() => images)
    );

    images = imageArray;
  });

  function updateImagesArray(fileList: FileList | null, imageArray: Image[]) {
    if (!fileList) {
      return [];
    }

    const fileArray = Array.from(fileList);

    for (const image of imageArray) {
      if (!fileArray.find((file) => file.name === image.file.name)) {
        URL.revokeObjectURL(image.objectUrl);
        image.isDelete = true;
      }
    }

    imageArray = imageArray.filter((image) => !image.isDelete);

    for (const file of fileArray) {
      const size = file.size / 1024 / 1024;
      if (size > 10) {
        alert(`File ${file.name} size exceeds 20MB`);
        removeImage(file.name);
        continue;
      }

      const newImage = {
        file,
        objectUrl: URL.createObjectURL(file),
        isDelete: false,
      };

      if (!imageArray.find((image) => image.file.name === file.name)) {
        imageArray.push(newImage);
      }
    }

    return imageArray;
  }

  function removeImage(fileName: string) {
    if (!files) {
      return;
    }
    const dataTransfer = new DataTransfer();
    for (const file of files) {
      if (file.name !== fileName) {
        dataTransfer.items.add(file);
      }
    }
    files = dataTransfer.files;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    isSubmitting = true;

    const formData = new FormData(event.target as HTMLFormElement);
    const { error, data } = await actions.postFiles(formData);
    if (!error) navigate(`/batch?id=${data}`);
  }

  onDestroy(() => {
    images.forEach((image) => {
      URL.revokeObjectURL(image.objectUrl);
    });
  });
</script>

{#if isSubmitting}
  <h3 class="font-black text-2xl text-90">Uploading...</h3>
  <section class="text-75 grid grid-cols-2 md:grid-cols-3 gap-4">
    {#each images as image (image.file.name)}
      <div class="group relative h-auto w-full overflow-hidden rounded-lg">
        <img
          class="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-110"
          src={image.objectUrl}
          alt={image.file.name}
        />
      </div>
    {/each}
  </section>
{:else}
  <form onsubmit={submit} id="post-files">
    <div class="space-y-2 my-2">
      <div class="flex flex-row gap-4">
        <label class="block max-w-fit relative">
          <div class="btn-regular rounded-lg active:scale-90 py-3 px-4 cursor-pointer grow">
            Attach
            <Icon class="text-[1.50rem]" icon="material-symbols:attach-file" />
          </div>
          <input
            accept="image/png,image/jpg,image/jpeg,image/webp"
            class="absolute top-0 left-0 opacity-0 -z-10"
            id="files"
            multiple
            name="files"
            required
            type="file"
            bind:files
          />
        </label>
        <button class="btn-regular rounded-lg active:scale-90 py-3 px-4 cursor-pointer" type="submit">
          Upload <Icon class="text-[1.50rem]" icon="material-symbols:upload" />
        </button>
      </div>
      {#if images.length > 0}
        <h3 class="font-black text-2xl text-90">Selected Files</h3>
      {:else}
        <h3 class="text-75">
          After selecting files, they will appear here. You can remove unwanted images by clicking it.
        </h3>
      {/if}
      <section class="text-75 grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each images as image (image.file.name)}
          <div transition:fade={{ duration: 300 }}>
            <button
              class="group relative h-auto w-full overflow-hidden rounded-lg cursor-pointer"
              type="button"
              onclick={() => removeImage(image.file.name)}
            >
              <img
                class="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-110"
                src={image.objectUrl}
                alt={image.file.name}
              />
              <div
                class="absolute inset-0 w-full h-full bg-transparent group-hover:bg-black/70 transition duration-300 z-10 text-white flex justify-center items-center"
              >
                <Icon
                  class="text-[4rem] opacity-0 group-hover:opacity-100 transition duration-300 scale-50 group-hover:scale-100"
                  icon="material-symbols:delete"
                />
              </div>
            </button>
            <p class="w-64 truncate font-bold text-sm px-2">{image.file.name}</p>
            <p class="text-50 text-xs px-2">{image.file.size / 1000} KB</p>
          </div>
        {/each}
      </section>
    </div>
  </form>
{/if}
