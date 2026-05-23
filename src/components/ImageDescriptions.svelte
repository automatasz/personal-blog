<script lang="ts">
  import type { Description } from "@utils/db";
  import { onDestroy, onMount } from "svelte";
  import { slide } from "svelte/transition";
  import { actions } from "astro:actions";
  import ImageWithLoading from "./ImageWithLoading.svelte";
  import PhotoSwipeLightbox from "photoswipe/lightbox";
  import "photoswipe/style.css";
  import Icon from "@iconify/svelte";

  let { appId }: { appId: string } = $props();
  let descriptions: Description[] | undefined = $state(undefined);
  let batchId: string | null = $state(null);
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

      descriptions = data.descriptions;
      batch = data.batch;

      if (data.descriptions.some((image) => !image.result)) {
        pollBatchComplete(id);
      } else {
        setTimeout(initLightbox, 0);
      }
    });
  }

  function pollBatchComplete(id: string) {
    let attempts = 0;

    function tick() {
      actions.getBatch({ batchId: id }).then(({ error, data }) => {
        if (error) return;

        descriptions = data.descriptions;
        batch = data.batch;

        if (data.descriptions.every((image) => image.result)) {
          setTimeout(initLightbox, 0);
          return;
        }

        if (attempts++ < 5) timeoutId = setTimeout(tick, 5000) as unknown as number;
      });
    }

    tick();
  }

  onDestroy(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (lightbox) {
      lightbox.destroy();
    }
  });

  function pollRegenerate(id: string, descId: string) {
    let attempts = 0;

    function tick() {
      actions.getBatch({ batchId: id }).then(({ data, error }) => {
        if (error) return;

        descriptions = data.descriptions;

        const updated = data.descriptions.find(d => d.id === descId);
        if (updated?.result === "success" || updated?.result === "fail") return;
        if (attempts++ < 5) setTimeout(tick, 5000);
      });
    }

    tick();
  }

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

    // Refresh data asynchronously
    if (batchId) {
      pollRegenerate(batchId, descriptionId);
    }
  }
</script>

<section class="text-75 mt-6">
  {#if batch}
    <div class="flex items-center justify-between mb-8 sticky top-0 z-20 bg-[var(--card-bg)] -mx-9 px-9 py-4">
      <h1 class="text-90 text-2xl font-heading font-black tracking-tight">{batch.title}</h1>
      {#if descriptions && descriptions.length > 0}
        <button
          class="btn-regular active:scale-90 text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all"
          onclick={downloadAsAdobeStockCSV}
          title="Download as Adobe Stock CSV"
        >
          <Icon icon="lucide:download" class="text-sm" />
          Export CSV
        </button>
      {/if}
    </div>
  {/if}
  {#if errorMessage}
    <div class="card-base rounded-xl px-6 py-4 text-red-600 flex items-center gap-2">
      <Icon icon="material-symbols:error-outline" class="text-lg" />
      <span>Error when displaying image descriptions: {errorMessage}.</span>
    </div>
  {:else if !descriptions}
    <div class="flex justify-center py-12">
      <Icon
        class="text-3xl text-[var(--primary)]"
        icon="line-md:loading-loop"
        aria-label="loading"
      />
    </div>
  {/if}

  {#if descriptions}
    <div class="pswp-gallery space-y-5" id="batch-gallery">
      {#each descriptions as description (description.id)}
        <div class="card-base rounded-xl overflow-hidden transition-shadow duration-300">
          {#if editingId === description.id}
            <!-- Edit Mode -->
            <div class="p-6" transition:slide>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-semibold mb-1.5 text-50" for="edit-title">Title</label>
                  <input
                    id="edit-title"
                    type="text"
                    class="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-75 text-sm"
                    bind:value={editTitle}
                  />
                </div>
                <div>
                  <label class="block text-sm font-semibold mb-1.5 text-50" for="edit-desc">Description</label>
                  <textarea
                    id="edit-desc"
                    class="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-75 text-sm h-24"
                    bind:value={editDescription}
                  ></textarea>
                </div>
                <div>
                  <label class="block text-sm font-semibold mb-1.5 text-50" for="edit-keywords">Keywords (comma-separated)</label>
                  <textarea
                    id="edit-keywords"
                    class="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-75 text-sm h-28"
                    bind:value={editKeywords}
                  ></textarea>
                </div>
                <div class="flex gap-2 pt-1">
                  <button
                    class="btn-regular active:scale-90 text-sm px-5 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
                    onclick={() => saveEditing(description.id)}
                    disabled={isSaving}
                  >
                    <Icon icon="lucide:save" class="text-sm" />
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    class="btn-ghost active:scale-90 text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                    onclick={cancelEditing}
                  >
                    <Icon icon="lucide:x" class="text-sm" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          {:else}
            <!-- View Mode -->
            <div class="grid md:grid-cols-[minmax(280px,1fr)_420px] gap-0">
              <!-- Image -->
              <div class="p-3">
                <a
                  class="group relative overflow-hidden rounded-lg cursor-zoom-in block max-h-[50vh]"
                  href={getImageSrc(description)}
                  data-pswp-width={description.width || 800}
                  data-pswp-height={description.height || 600}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ImageWithLoading {description} {appId} />
                </a>
              </div>
              <!-- Meta -->
              <div class="p-5 flex flex-col">
                <div class="flex items-start justify-between gap-2">
                  {#if description.title}
                    <h3 class="font-heading font-bold text-base text-90 leading-snug">{description.title}</h3>
                  {:else}
                    <div class="skeleton-text w-48 h-5 rounded"></div>
                  {/if}
                  <div class="flex gap-1 shrink-0 pt-0.5">
                    <button
                      class="btn-ghost active:scale-90 p-1.5 rounded-lg transition-colors"
                      onclick={() => startEditing(description)}
                      title="Edit"
                    >
                      <Icon icon="lucide:pencil" class="text-sm" />
                    </button>
                    <button
                      class="btn-ghost active:scale-90 p-1.5 rounded-lg transition-colors"
                      onclick={() => regenerate(description.id)}
                      title="Regenerate"
                    >
                      <Icon icon="lucide:refresh-cw" class="text-sm" />
                    </button>
                  </div>
                </div>
                <p class="text-xs text-50 mt-1">{description.file_name}</p>
                {#if description.result === "fail"}
                  <p class="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <Icon icon="material-symbols:warning-outline" class="text-xs" />
                    Description failed. Try again.
                  </p>
                {:else if !description.result}
                  <div class="mt-3 space-y-2">
                    <div class="skeleton-text w-full h-4 rounded"></div>
                    <div class="skeleton-text w-3/4 h-4 rounded"></div>
                    <div class="skeleton-text w-1/2 h-4 rounded"></div>
                  </div>
                {:else}
                  <p class="text-sm text-75 mt-3 leading-relaxed">{description.description}</p>
                {/if}
              </div>
            </div>
            <!-- Keywords -->
            {#if description.keywords}
              <div class="px-5 pb-5">
                <div class="flex gap-1.5 flex-wrap items-center">
                  {#each description.keywords.slice(0, 10) as keyword, index (index)}
                    <span
                      class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]"
                    >{keyword}</span>
                  {/each}
                  {#if expandedKeywords[description.id] && description.keywords.length > 10}
                    <div transition:slide class="w-full flex gap-1.5 flex-wrap">
                      {#each description.keywords.slice(10) as keyword, index (index)}
                        <span
                          class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]"
                        >{keyword}</span>
                      {/each}
                    </div>
                  {/if}
                  {#if description.keywords.length > 10}
                    <button
                      class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium btn-ghost active:scale-90 transition-colors gap-0.5"
                      onclick={() => expandedKeywords[description.id] = !expandedKeywords[description.id]}
                    >
                      <Icon icon={expandedKeywords[description.id] ? "lucide:chevron-up" : "lucide:chevron-down"} class="text-xs" />
                      {expandedKeywords[description.id] ? "Fewer" : "+" + (description.keywords.length - 10)}
                    </button>
                  {/if}
                </div>
                <button
                  class="mt-2.5 btn-ghost active:scale-90 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                  onclick={() =>
                    navigator.clipboard.writeText(
                      description.keywords?.join(", ") || "",
                    )}
                  title="Copy keywords to clipboard"
                >
                  <Icon icon="lucide:copy" class="text-xs" />
                  Copy
                </button>
              </div>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>
