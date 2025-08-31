<script lang="ts">
  import Icon from "@iconify/svelte";
  import { fade } from "svelte/transition";
  import { actions } from "astro:actions";
  import { navigate } from "astro:transitions/client";
  import { createUploader, UploadButton, minifyImage } from "@utils/storage-client";
  import { twMerge } from "tailwind-merge";

  let isSubmitting: boolean = $state(false);
  let errorMessage: string | undefined = $state(undefined);
  let files: { key: string; name: string; size: number; url: string }[] = $state([]);

  const uploader = createUploader("imageUploader", {
    onBeforeUploadBegin: async (files) => {
      const promises = files.map((file) => minifyImage(file));
      return Promise.all(promises);
    },
    onClientUploadComplete: (res) => {
      console.log(`onClientUploadComplete`, res);
      files = res.map((file) => ({ key: file.key, name: file.name, size: file.size, url: file.ufsUrl }));
    },
    onUploadError: (error: Error) => {
      alert(`ERROR! ${error.message}`);
    },
  });

  function removeImage(fileKey: string) {
    files = files.filter((file) => file.key !== fileKey);
  }

  function removeAllImages() {
    files = [];
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    isSubmitting = true;

    const { error, data } = await actions.postFileIds({
      fileIds: files.map((file) => file.key),
    });

    if (error) {
      errorMessage = error.message;
      throw error;
    }

    navigate(`/batch?id=${data}`);
  }
</script>

<div class="space-y-4 mt-12 mb-16">
  {#if isSubmitting}
    {#if errorMessage}
      <h3 class="text-red-600">Error when uploading files: {errorMessage}.</h3>
    {:else}
      <h3 class="font-black text-2xl text-90 flex flex-row gap-2 grow">
        Requesting descriptions...
        <Icon class="text-[1.50rem]" icon="line-md:loading-loop" aria-label="loading" />
      </h3>
    {/if}
  {:else}
    {#if files.length > 0}
      <form onsubmit={submit} id="post-files" class="flex flex-row gap-4">
        <button class="btn-regular rounded-lg active:scale-90 py-3 px-6 cursor-pointer" type="submit">
          Describe <Icon class="text-[1.50rem]" icon="material-symbols:upload" />
        </button>
        <button
          class="btn-regular rounded-lg active:scale-90 py-3 px-6 cursor-pointer"
          type="button"
          onclick={removeAllImages}
        >
          Delete & start over <Icon class="text-[1.50rem]" icon="mdi:garbage" />
        </button>
      </form>
    {:else}
      <div class="w-fit">
        <UploadButton
          {uploader}
          config={{ cn: twMerge }}
          appearance={{
            button:
              "min-w-48 !btn-regular ut-ready:bg-[var(--btn-regular-bg)] ut-ready:hover:bg-[var(--btn-regular-bg-hover)] ut-ready:active:bg-[var(--btn-regular-bg-active)] rounded-lg active:scale-90 py-3 px-4 cursor-pointer grow hide-input-for-uploadthing focus-within:!ring-0 data-[state=uploading]:after:bg-[var(--btn-regular-bg-hover)]",
            container: "text-75",
          }}
        ></UploadButton>
      </div>
    {/if}

    {#if files.length > 0}
      <h3 class="font-black text-2xl text-90">Selected Files</h3>
    {:else}
      <h3 class="text-75">
        After selecting files, they will appear here. You can remove unwanted images by clicking them.
      </h3>
    {/if}
    <section class="text-75 grid grid-cols-2 md:grid-cols-4 gap-4">
      {#each files as image (image.key)}
        <div transition:fade={{ duration: 300 }}>
          <button
            class="group relative h-auto w-full overflow-hidden rounded-lg cursor-pointer"
            type="button"
            onclick={() => removeImage(image.key)}
          >
            <img
              class="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-110"
              src={image.url}
              alt="User uploaded file"
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
          <p class="w-64 truncate font-bold text-sm px-2">{image.name}</p>
          <p class="text-50 text-xs px-2">{image.size / 1000} KB</p>
        </div>
      {/each}
    </section>
  {/if}
</div>
<!-- Tailwind classes that are used by upload thing and must be added to the bundle -->
<!-- block h-5 w-5 animate-spin align-middle text-white relative z-50 -->
