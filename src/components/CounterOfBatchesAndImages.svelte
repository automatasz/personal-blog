<script lang="ts">
  import Icon from "@iconify/svelte";
  const {
    stats,
    error,
  }: {
    stats:
      | {
          imageCount: number;
          batchCount: number;
          tokenSum: number;
          creditsRemaining: number;
        }
      | undefined;
    error?: string;
  } = $props();

  function formatTokens(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }
</script>

<section class="space-y-4 mt-6 mb-8">
  <h3 class="font-heading font-bold text-xl text-90">
    So far, you've created:
  </h3>
  {#if error}
    <div
      class="card-base rounded-xl px-6 py-4 text-red-600 flex items-center gap-2"
    >
      <Icon icon="material-symbols:error-outline" class="text-lg" />
      <span>Error when loading stats: {error}.</span>
    </div>
  {/if}
  {#if stats}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="card-base rounded-xl px-5 py-5 flex items-center gap-4">
        <div
          class="w-11 h-11 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0"
        >
          <Icon
            class="text-2xl text-[var(--primary)]"
            icon="material-symbols:collections-bookmark-outline"
          />
        </div>
        <div>
          <p class="text-sm text-50 font-medium">Batches</p>
          <p class="text-2xl font-heading font-bold text-90">
            {stats.batchCount}
          </p>
        </div>
      </div>
      <div class="card-base rounded-xl px-5 py-5 flex items-center gap-4">
        <div
          class="w-11 h-11 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0"
        >
          <Icon
            class="text-2xl text-[var(--primary)]"
            icon="material-symbols:image-outline"
          />
        </div>
        <div>
          <p class="text-sm text-50 font-medium">Images</p>
          <p class="text-2xl font-heading font-bold text-90">
            {stats.imageCount}
          </p>
        </div>
      </div>
      <div class="card-base rounded-xl px-5 py-5 flex items-center gap-4">
        <div
          class="w-11 h-11 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0"
        >
          <Icon
            class="text-2xl text-[var(--primary)]"
            icon="material-symbols:tokens"
          />
        </div>
        <div>
          <p class="text-xl text-50 font-medium">Tokens</p>
          <p class="text-2xl font-heading font-bold text-90">
            {formatTokens(stats.tokenSum)}
          </p>
        </div>
      </div>
      <div class="card-base rounded-xl px-5 py-5 flex items-center gap-4">
        <div
          class="w-11 h-11 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0"
        >
          <Icon
            class="text-2xl text-[var(--primary)]"
            icon="material-symbols:credit-card-outline"
          />
        </div>
        <div>
          <p class="text-sm text-50 font-medium">Credits</p>
          <p class="text-2xl font-heading font-bold text-90">
            {stats.creditsRemaining}
          </p>
        </div>
      </div>
    </div>
  {:else}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      {#each [0, 1, 2, 3] as _}
        <div class="card-base rounded-xl px-5 py-5 flex items-center gap-4">
          <div
            class="w-11 h-11 rounded-xl bg-[var(--btn-plain-bg-hover)] animate-pulse shrink-0"
          ></div>
          <div class="space-y-2">
            <div
              class="h-3.5 w-14 rounded bg-[var(--btn-plain-bg-hover)] animate-pulse"
            ></div>
            <div
              class="h-6 w-10 rounded bg-[var(--btn-plain-bg-hover)] animate-pulse"
            ></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>
