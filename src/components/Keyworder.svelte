<script lang="ts">
  import ImageUploader from "./ImageUploader.svelte";
  import UserSessionCard from "./UserSessionCard.svelte";
  import { authClient } from "@utils/auth-client";

  const session = authClient.useSession();
</script>

{#if !$session.data}
  <div class="text-center py-8">
    <UserSessionCard />
  </div>
{:else}
  <ImageUploader />
{/if}
