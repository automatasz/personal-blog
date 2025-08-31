<script lang="ts">
  import Icon from "@iconify/svelte";
  import { authClient } from "@utils/auth-client";
  const session = authClient.useSession();
  const signIn = () => {
    authClient.signIn.social({
      provider: "google",
      callbackURL: "/keyworder",
      errorCallbackURL: "/error/",
      newUserCallbackURL: "/",
    });
  };

  const signOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  };
</script>

{#if $session.isPending || $session.isRefetching}
  <button aria-label="Sign In or Sign Out" class="btn-regular rounded-lg active:scale-90 py-3 px-4 cursor-pointer grow">
    Loading
    <Icon class="text-[1.25rem]" icon="material-symbols:autorenew-rounded" />
  </button>
{:else if $session.data}
  <button
    aria-label="Sign Out"
    class="btn-regular rounded-lg active:scale-90 py-3 px-4 cursor-pointer grow"
    onclick={signOut}
  >
    Sign Out
    <Icon class="text-[1.25rem]" icon="material-symbols:logout" />
  </button>
{:else}
  <button
    aria-label="Sign In"
    class="btn-regular rounded-lg active:scale-90 py-3 px-4 cursor-pointer grow"
    onclick={signIn}
  >
    Sign In
    <Icon class="text-[1.25rem]" icon="material-symbols:login" />
  </button>
{/if}
