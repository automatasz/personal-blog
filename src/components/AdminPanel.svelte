<script lang="ts">
  import { actions } from "astro:actions";
  import { onMount } from "svelte";

  const { initialCosts }: { initialCosts: Record<string, number> | null } = $props();

  let uploadCost = $state(initialCosts?.upload ?? 1);
  let describeCost = $state(initialCosts?.describe ?? 7);
  let regenerateCost = $state(initialCosts?.regenerate ?? 5);
  let saving = $state(false);
  let message = $state("");
  let isError = $state(false);

  onMount(async () => {
    const { data } = await actions.getAppSettings();
    if (data?.creditCosts) {
      uploadCost = data.creditCosts.upload;
      describeCost = data.creditCosts.describe;
      regenerateCost = data.creditCosts.regenerate;
    }
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    message = "";
    isError = false;

    const { error } = await actions.updateAppSettings({
      creditCosts: {
        upload: uploadCost,
        describe: describeCost,
        regenerate: regenerateCost,
      },
    });

    saving = false;

    if (error) {
      isError = true;
      message = error.message;
    } else {
      message = "Settings saved successfully.";
    }
  }
</script>

<form class="space-y-4 mt-8" onsubmit={save}>
  <h3 class="font-black text-xl text-90">Credit Costs</h3>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <label class="flex flex-col gap-1">
      <span class="text-sm text-75">Upload (credits)</span>
      <input
        type="number"
        min="0"
        bind:value={uploadCost}
        class="input-field rounded-lg px-3 py-2 bg-[var(--card-bg)] border border-[var(--line-color)] text-90"
      />
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-sm text-75">Describe (credits)</span>
      <input
        type="number"
        min="0"
        bind:value={describeCost}
        class="input-field rounded-lg px-3 py-2 bg-[var(--card-bg)] border border-[var(--line-color)] text-90"
      />
    </label>

    <label class="flex flex-col gap-1">
      <span class="text-sm text-75">Regenerate (credits)</span>
      <input
        type="number"
        min="0"
        bind:value={regenerateCost}
        class="input-field rounded-lg px-3 py-2 bg-[var(--card-bg)] border border-[var(--line-color)] text-90"
      />
    </label>
  </div>

  <button
    type="submit"
    disabled={saving}
    class="btn-regular rounded-lg active:scale-90 py-2 px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {#if saving}
      Saving...
    {:else}
      Save Changes
    {/if}
  </button>

  {#if message}
    <p class={isError ? "text-red-600 text-sm" : "text-green-600 text-sm"}>
      {message}
    </p>
  {/if}
</form>
