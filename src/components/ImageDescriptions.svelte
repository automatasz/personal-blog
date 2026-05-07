<script lang="ts">
  import type { Description } from "@utils/db";
  import { onDestroy, onMount } from "svelte";
  import { actions } from "astro:actions";
  import ImageWithLoading from "./ImageWithLoading.svelte";
  import Icon from "@iconify/svelte";

  let { appId }: { appId: string } = $props();
  let descriptions: Description[] | undefined = $state(undefined);
  let batchId: string | null = $state(null);
  let attempts: number = $state(0);
  let errorMessage: string | undefined = $state(undefined);
  let timeoutId: number | undefined = $state(undefined);
  let expandedKeywords: { [key: string]: boolean } = $state({});
  let batch: { title: string | null } | undefined = $state(undefined);

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    batchId = urlParams.get("id");
    if (batchId && uuidRegex.test(batchId)) {
      fetchBatch(batchId); // check if maybe it is already done, if not check if events are complete
    } else {
      errorMessage = "No valid batch ID provided";
    }
  });

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
        "3", // default category
        "", // no releases
      ]);
    });

    // Convert to CSV with proper escaping
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(","),
      )
      .join("\n");

    // Create blob and download
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
        </div>
      </div>
    {/each}
  {/if}
</section>
