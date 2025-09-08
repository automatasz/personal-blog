<script lang="ts">
  import BatchList from "./BatchList.svelte";
  import ImageUploader from "./ImageUploader.svelte";
  import UserSessionCard from "./UserSessionCard.svelte";
  import { authClient } from "@utils/auth-client";

  const session = authClient.useSession();
</script>

{#if !$session.data}
  <UserSessionCard />
{:else if $session.data.user.role === "admin"}
  <ImageUploader />
  <BatchList />
{:else}
  <p class="text-red-600">You don't have permission to use this feature.</p>
{/if}
