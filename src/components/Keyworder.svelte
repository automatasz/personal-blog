<script lang="ts">
  import BatchList from "./BatchList.svelte";
  import ImageUploader from "./ImageUploader.svelte";
  import UserSessionCard from "./UserSessionCard.svelte";
  import { authClient } from "@utils/auth-client";

  const session = authClient.useSession();
</script>

{#if !$session.data}
  <UserSessionCard />
{:else}
  <ImageUploader />
  <BatchList />
{/if}
