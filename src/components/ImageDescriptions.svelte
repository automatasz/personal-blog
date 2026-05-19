<script lang="ts">
  import type { Description } from "@utils/db";
  import { onDestroy, onMount } from "svelte";
  import { actions } from "astro:actions";
  import ImageWithLoading from "./ImageWithLoading.svelte";
  import PhotoSwipeLightbox from "photoswipe/lightbox";
  import "photoswipe/style.css";
  import Icon from "@iconify/svelte";

  let { appId }: { appId: string } = $props();
  let descriptions: Description[] | undefined = $state(undefined);
  let batchId: string | null = $state(null);
  let attempts: number = $state(0);
  let errorMessage: string | undefined = $state(undefined);
  let timeoutId: number | undefined = $state(undefined);
  let expandedKeywords: { [key: string]: boolean } = $state({});
  let batch: { title: string | null } | undefined = $state(undefined);
  let lightbox: PhotoSwipeLightbox | null = $state(null);

  // Edit state
  let editingId: string | null = $state(null);
  let editTitle: string = $state("");
  let editDescription: string = $state("");
  let editKeywords: string = $state("");
  let isSaving: boolean = $state(false);

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    batchId = urlParams.get("id");
    if (batchId && uuidRegex.test(batchId)) {
      fetchBatch(batchId);
    } else {
      errorMessage = "No valid batch ID provided";
    }
  });

  function initLightbox() {
    if (lightbox) {
      lightbox.destroy();
    }

    lightbox = new PhotoSwipeLightbox({
      gallery: "#batch-gallery",
      children: "a",
      closeSVG:
        '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M480-424 284-228q-11 11-28 11t-28-11q-11-11-11-28t11-28l196-196-196-196q-11-11-11-28t11-28q11-11 28-11t28 11l196 196 196-196q11-11 28-11t28 11q11 11 11 28t-11 28L536-480l196 196q11 11 11 28t-11 28q-11 11-28 11t-28-11L480-424Z"/></svg>',
      padding: { top: 20, bottom: 20, left: 20, right: 20 },
      wheelToZoom: true,
      arrowPrev: false,
      arrowNext: false,
      imageClickAction: "close",
      tapAction: "close",
      doubleTapAction: "zoom",
      pswpModule: () => import("photoswipe"),
    });

    lightbox.init();
  }

  function fetchBatch(id: string) {
    actions.getBatch({ batchId: id }).then(({ error, data }) => {
      if (error) {
        errorMessage = error.message;
        throw error;
      }

      if (
        data.descriptions.length > 0 &&
        data.descriptions.every((image) => image.result || image.description)
      ) {
        descriptions = data.descriptions;
        setTimeout(initLightbox, 0);
      } else {
        fetchEventsComplete(id);
      }

      batch = data.batch;
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
        timeoutId = setTimeout(
          () => fetchEventsComplete(id),
          5000,
        ) as unknown as number;
        attempts++;
      } else {
        const message =
          "Image descriptions do not exist under such ID or too many attempts have been made at retrieving descriptions, try again later";
        errorMessage = message;
        throw new Error(message);
      }
    });
  }

  onDestroy(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (lightbox) {
      lightbox.destroy();
    }
  });

  function downloadAsAdobeStockCSV() {
    if (!descriptions) return;

    const rows = [["Filename", "Title", "Keywords", "Category", "Releases"]];

    descriptions.forEach((desc) => {
      const keywords = desc.keywords?.join(", ") || "";
      rows.push([
        desc.file_name || "",
        desc.title || "",
        keywords,
        "3",
        "",
      ]);
    });

    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `keyworder-batch-${batchId}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function getImageSrc(description: Description) {
    return `https://${appId}.ufs.sh/f/${description.file_id}`;
  }

  // Edit functions
  function startEditing(description: Description) {
    editingId = description.id;
    editTitle = description.title || "";
    editDescription = description.description || "";
    editKeywords = description.keywords?.join(", ") || "";
  }

  function cancelEditing() {
    editingId = null;
    editTitle = "";
    editDescription = "";
    editKeywords = "";
  }

  async function saveEditing(descriptionId: string) {
    isSaving = true;

    const keywords = editKeywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const { error } = await actions.updateDescription({
      descriptionId,
      title: editTitle,
      description: editDescription,
      keywords,
    });

    isSaving = false;

    if (error) {
      alert("Failed to save: " + error.message);
      return;
    }

    // Update local state
    if (descriptions) {
      descriptions = descriptions.map((d) =>
        d.id === descriptionId
          ? {
              ...d,
              title: editTitle,
              description: editDescription,
              keywords,
            }
          : d
      );
    }

    cancelEditing();
  }

  async function regenerate(descriptionId: string) {
    if (!confirm("Regenerate description for this image?")) return;

    const { error } = await actions.regenerateDescription({ descriptionId });

    if (error) {
      alert("Failed to regenerate: " + error.message);
      return;
    }

    // Refresh data
    if (batchId) {
      fetchBatch(batchId);
    }
  }
</script>

<section class="text-75 divide-y-2 space-y-4 mt-2">
  {#if batch}
    <div class="flex items-center justify-between">
      <h1 class="text-90 text-4xl font-black">{batch.title}</h1>
      {#if descriptions && descriptions.length > 0}
        <button
          class="btn-regular active:scale-90 text-base px-4 py-3 rounded-lg flex items-center gap-2 hover:bg-100 transition-colors"
          onclick={downloadAsAdobeStockCSV}
          title="Download as Adobe Stock CSV"
        >
          <Icon icon="lucide:download" class="text-base" />
          Adobe Stock CSV
        </button>
      {/if}
    </div>
  {/if}
  {#if errorMessage}
    <p class="text-red-600">
      Error when displaying image descriptions: {errorMessage}.
    </p>
  {:else if !descriptions}
    <Icon
      class="text-[1.50rem]"
      icon="line-md:loading-loop"
      aria-label="loading"
    />
  {/if}

  {#if descriptions}
    <div class="pswp-gallery pt-4" id="batch-gallery">
      {#each descriptions as description (description.id)}
        <div class="grid md:grid-cols-[300px_1fr] gap-4 pt-4">
          <div class="p-1">
            <a
              class="group relative h-auto w-full overflow-hidden rounded-lg cursor-zoom-in block"
              href={getImageSrc(description)}
              data-pswp-width={description.width || 800}
              data-pswp-height={description.height || 600}
              target="_blank"
              rel="noreferrer"
            >
              <ImageWithLoading {description} {appId} />
            </a>
          </div>
          <div class="lg:col-span-2 p-1">
            {#if editingId === description.id}
              <!-- Edit Mode -->
              <div class="space-y-3">
                <div>
                  <label class="block text-sm font-bold mb-1" for="edit-title">Title</label>
                  <input
                    id="edit-title"
                    type="text"
                    class="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-75"
                    bind:value={editTitle}
                  />
                </div>
                <div>
                  <label class="block text-sm font-bold mb-1" for="edit-desc">Description</label>
                  <textarea
                    id="edit-desc"
                    class="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-75 h-24"
                    bind:value={editDescription}
                  ></textarea>
                </div>
                <div>
                  <label class="block text-sm font-bold mb-1" for="edit-keywords">Keywords (comma-separated)</label>
                  <input
                    id="edit-keywords"
                    type="text"
                    class="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-75"
                    bind:value={editKeywords}
                  />
                </div>
                <div class="flex gap-2">
                  <button
                    class="btn-regular active:scale-90 text-base px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-100 transition-colors disabled:opacity-50"
                    onclick={() => saveEditing(description.id)}
                    disabled={isSaving}
                  >
                    <Icon icon="lucide:save" class="text-base" />
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    class="btn-regular active:scale-90 text-base px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-100 transition-colors"
                    onclick={cancelEditing}
                  >
                    <Icon icon="lucide:x" class="text-base" />
                    Cancel
                  </button>
                </div>
              </div>
            {:else}
              <!-- View Mode -->
              <div class="flex items-start justify-between">
                <h3 class="font-black text-xl">{description.title}</h3>
                <div class="flex gap-1">
                  <button
                    class="btn-regular active:scale-90 p-2 rounded-lg hover:bg-100 transition-colors"
                    onclick={() => startEditing(description)}
                    title="Edit"
                  >
                    <Icon icon="lucide:pencil" class="text-sm" />
                  </button>
                  <button
                    class="btn-regular active:scale-90 p-2 rounded-lg hover:bg-100 transition-colors"
                    onclick={() => regenerate(description.id)}
                    title="Regenerate"
                  >
                    <Icon icon="lucide:refresh-cw" class="text-sm" />
                  </button>
                </div>
              </div>
              <p class="text-sm text-50">{description.file_name}</p>
              {#if description.result !== "success"}
                <p class="text-sm text-red-600">
                  The image description failed. Please try again and make sure the
                  image does not contain content that breaks the Terms of Service.
                </p>
              {/if}
              <p class="my-2">{description.description}</p>
              {#if description.keywords}
                <div class="flex gap-2 flex-wrap items-center">
                  {#each description.keywords.slice(0, expandedKeywords[description.id] ? undefined : 10) as keyword, index (index)}
                    <span class="btn-regular h-8 text-sm px-3 rounded-lg"
                      >{keyword}</span
                    >
                  {/each}
                  {#if description.keywords.length > 10}
                    <button
                      class="btn-regular active:scale-90 h-8 text-sm px-3 rounded-lg flex items-center gap-1 hover:bg-100 transition-colors"
                      onclick={() => expandedKeywords[description.id] = !expandedKeywords[description.id]}
                    >
                      <Icon icon={expandedKeywords[description.id] ? "lucide:chevron-up" : "lucide:chevron-down"} class="text-sm" />
                      {expandedKeywords[description.id] ? "Show less" : "Show more (" + (description.keywords.length - 10) + ")"}
                    </button>
                  {/if}
                </div>
                <button
                  class="mt-4 btn-regular active:scale-90 text-base px-4 py-3 rounded-lg flex items-center gap-1 hover:bg-100 transition-colors"
                  onclick={() =>
                    navigator.clipboard.writeText(
                      description.keywords?.join(", ") || "",
                    )}
                  title="Copy keywords to clipboard"
                >
                  <Icon icon="lucide:copy" class="text-base" />
                  Copy
                </button>
              {/if}
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>
