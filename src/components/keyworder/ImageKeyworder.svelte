<script lang="ts">
  import SignIn from "@components/auth/SignIn.svelte";
  import ImageUploadForm from "@components/keyworder/ImageUploadForm.svelte";
  import { authClient } from "@utils/auth-client";

  const session = authClient.useSession();
</script>

{#if $session.data?.user.role === "admin"}
  <ImageUploadForm />
{:else}
  <SignIn />
{/if}
