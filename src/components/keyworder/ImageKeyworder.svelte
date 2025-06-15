<script lang="ts">
  import ImageUploadForm from "@components/keyworder/ImageUploadForm.svelte";
  import { authClient } from "@utils/auth-client";
  import { type Image } from "@components/keyworder/types";

  const session = authClient.useSession();
  let images: Array<Image> = $state([]);
</script>

{#if $session.data?.user.role === "admin"}
  <ImageUploadForm {images} />
{/if}
