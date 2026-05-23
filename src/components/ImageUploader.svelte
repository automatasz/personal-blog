<script lang="ts">
  import Icon from "@iconify/svelte";
  import { fly } from "svelte/transition";
  import { onMount } from "svelte";
  import { actions } from "astro:actions";
  import { navigate } from "astro:transitions/client";
  import {
    createUploader,
    UploadButton,
    minifyImage,
  } from "@utils/storage-client";
  import { twMerge } from "tailwind-merge";
  import ImageWithLoading from "./ImageWithLoading.svelte";
  import { UPLOADTHING_APP_ID } from "astro:env/client";
  import { CREDIT_COST_UPLOAD, CREDIT_COST_DESCRIBE } from "@/constants/credit-costs";

  type FileForUpload = {
    key: string;
    name: string;
    size: number;
    url: string;
    width: number;
    height: number;
  };

  let isSubmitting: boolean = $state(false);
  let errorMessage: string | undefined = $state(undefined);
  let files: FileForUpload[] = $state([]);
  let creditsRemaining: number | undefined = $state(undefined);

  onMount(() => {
    actions.getStats(null).then(({ data }) => {
      if (data) {
        creditsRemaining = data.creditsRemaining;
      }
    });
  });

  function refreshCredits() {
    actions.getStats(null).then(({ data }) => {
      if (data) {
        creditsRemaining = data.creditsRemaining;
      }
    });
  }
  let filesBeforeUpload: {
    width: number;
    height: number;
    file: File;
    originalSize: number;
  }[] = $state([]);

  const uploader = createUploader("imageUploader", {
    onBeforeUploadBegin: async (uploadedFiles) => {
      const promises = uploadedFiles.map((file) => minifyImage(file));
      const minifiedFiles = await Promise.all(promises);
      filesBeforeUpload = minifiedFiles;
      return minifiedFiles.map((file) => file.file);
    },
    onClientUploadComplete: (res) => {
      files = res.map((file, index) => {
        const fileBeforeUpload = filesBeforeUpload[index];
        return {
          key: file.key,
          name: file.name,
          size: fileBeforeUpload?.originalSize ?? file.size,
          url: file.ufsUrl,
          width: fileBeforeUpload?.width ?? 0,
          height: fileBeforeUpload?.height ?? 0,
        };
      });
      refreshCredits();
    },
    onUploadError: (error) => {
      if (error.code === "INTERNAL_CLIENT_ERROR") {
        alert("Upload failed. You may have insufficient credits or have reached your upload limit.");
      }
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
      files: files.map((file) => ({
        id: file.key,
        name: file.name,
        width: file.width,
        height: file.height,
      })),
    });

    if (error) {
      errorMessage = error.message;
      throw error;
    }

    navigate(`/batch?id=${data}`);
  }

  let totalCost = $derived(files.length * CREDIT_COST_DESCRIBE);
  let insufficientCredits = $derived(
    creditsRemaining !== undefined && totalCost > creditsRemaining
  );
  let needToRemove = $derived(
    insufficientCredits
      ? Math.ceil((totalCost - creditsRemaining!) / CREDIT_COST_DESCRIBE)
      : 0
  );
</script>

<div class="space-y-6 mt-8 mb-16">
  {#if isSubmitting}
    <div class="card-base rounded-xl px-8 py-10 text-center">
      {#if errorMessage}
        <div class="flex flex-col items-center gap-3">
          <Icon class="text-4xl text-red-600" icon="material-symbols:error-outline" />
          <h3 class="text-lg font-bold text-red-600">
            Error when uploading files: {errorMessage}
          </h3>
          <p class="text-50 text-sm">Please reach out to the administrator if this error continues to occur.</p>
        </div>
      {:else}
        <div class="flex flex-col items-center gap-4">
          <Icon
            class="text-4xl text-[var(--primary)]"
            icon="line-md:loading-loop"
            aria-label="loading"
          />
          <h3 class="text-xl font-heading font-bold text-90">
            Requesting descriptions...
          </h3>
          <p class="text-50 text-sm">This may take a moment. Please wait.</p>
        </div>
      {/if}
    </div>
  {:else}
    {#if files.length > 0}
      <div class="card-base rounded-xl px-6 py-4">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <span class="text-50 text-sm">
              {files.length} {files.length === 1 ? "file" : "files"} selected
            </span>
            <span class="text-30 text-sm">|</span>
            <span class="text-50 text-sm">
              Cost: <span class="font-bold text-75">{totalCost}</span> credits
            </span>
            {#if creditsRemaining !== undefined}
              <span class="text-50 text-sm">
                Balance: <span class="font-bold text-75">{creditsRemaining}</span> credits
              </span>
            {/if}
          </div>
          <form onsubmit={submit} id="post-files" class="flex flex-row gap-3">
            <button
              class="btn-regular rounded-lg active:scale-90 py-2.5 px-5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              type="submit"
              disabled={insufficientCredits}
            >
              <Icon icon="material-symbols:auto-awesome" class="text-lg" />
              Describe
            </button>
            <button
              class="rounded-lg active:scale-90 py-2.5 px-4 cursor-pointer flex items-center gap-2 transition-all border border-[var(--border)] text-75 hover:bg-[var(--btn-plain-bg-hover)]"
              type="button"
              onclick={removeAllImages}
            >
              <Icon icon="mdi:garbage" class="text-lg" />
              Clear
            </button>
          </form>
        </div>
        {#if insufficientCredits}
          <p class="text-red-600 text-sm mt-3 flex items-center gap-2">
            <Icon icon="material-symbols:warning-outline" class="text-base" />
            Describing {files.length} images costs {totalCost} credits, but you only have {creditsRemaining}.
            Remove {needToRemove} {needToRemove === 1 ? "image" : "images"} to continue.
          </p>
        {/if}
      </div>
    {:else}
      {#if creditsRemaining !== undefined && creditsRemaining <= 0}
        <div class="card-base rounded-xl px-8 py-12 text-center">
          <Icon class="text-4xl text-30 mx-auto" icon="material-symbols:credit-card-off-outline" />
          <p class="text-75 mt-3">You don't have enough credits to upload more images.</p>
        </div>
      {:else}
        <div class="card-base rounded-xl border-2 border-dashed border-[var(--border)] px-8 py-14 text-center transition-colors hover:border-[var(--primary)]/40 group">
          <div class="flex flex-col items-center gap-3">
            <Icon class="text-4xl text-30 group-hover:text-[var(--primary)]/60 transition-colors" icon="material-symbols:cloud-upload-outline" />
            <p class="text-75 font-heading font-semibold">Upload your images</p>
            <p class="text-50 text-sm max-w-md mx-auto">
              Drag and drop or click to browse. Images will be optimized automatically.
            </p>
            <div class="mt-2">
              <UploadButton
                {uploader}
                config={{ cn: twMerge }}
                appearance={{
                  button:
                    "!btn-regular ut-ready:bg-[var(--btn-regular-bg)] ut-ready:hover:bg-[var(--btn-regular-bg-hover)] ut-ready:active:bg-[var(--btn-regular-bg-active)] rounded-lg active:scale-90 py-3 px-6 cursor-pointer hide-input-for-uploadthing focus-within:!ring-0 data-[state=uploading]:after:bg-[var(--btn-regular-bg-hover)]",
                  container: "text-75",
                }}
              ></UploadButton>
            </div>
          </div>
        </div>
      {/if}
    {/if}

    <div class="flex items-center justify-between text-50 text-sm">
      <span>{CREDIT_COST_UPLOAD} credit per upload + {CREDIT_COST_DESCRIBE} credits per description</span>
      {#if creditsRemaining !== undefined}
        <span class="font-bold text-75">Credits remaining: {creditsRemaining}</span>
      {/if}
    </div>

    {#if files.length > 0}
      <div class="flex items-center justify-between">
        <h3 class="font-heading font-bold text-xl text-90">Selected Files</h3>
        <p class="text-50 text-xs">Click an image to remove it</p>
      </div>
      <section class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {#each files as image, i (image.key)}
          <div
            transition:fly={{ y: 20, duration: 300, delay: i * 60 }}
          >
            <button
              class="group relative w-full overflow-hidden rounded-xl cursor-pointer bg-[var(--card-bg)]"
              type="button"
              onclick={() => removeImage(image.key)}
            >
              <ImageWithLoading
                description={{
                  file_id: image.key,
                  title: image.name,
                  width: image.width,
                  height: image.height,
                }}
                appId={UPLOADTHING_APP_ID}
              />
              <div
                class="absolute inset-0 bg-transparent group-hover:bg-black/70 transition-all duration-300 z-10 flex items-center justify-center"
              >
                <Icon
                  class="text-4xl opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100 text-white"
                  icon="material-symbols:delete"
                />
              </div>
            </button>
            <div class="px-1.5 pt-2">
              <p class="truncate font-medium text-sm text-75">{image.name}</p>
              <p class="text-50 text-sm">
                {image.size > 1048576
                  ? (image.size / 1048576).toFixed(2) + " MB"
                  : (image.size / 1024).toFixed(0) + " KB"}
              </p>
            </div>
          </div>
        {/each}
      </section>
    {:else}
      <p class="text-50 text-sm italic">
        After selecting files, they will appear here. You can remove unwanted images by clicking them.
      </p>
    {/if}
  {/if}
</div>

<!-- Tailwind classes that are used by upload thing and must be added to the bundle -->
<!-- block h-5 w-5 animate-spin align-middle text-white relative z-50 -->
