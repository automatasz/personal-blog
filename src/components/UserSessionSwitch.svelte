<script lang="ts">
  import Icon from "@iconify/svelte";
  import { authClient } from "@utils/auth-client";
  const session = authClient.useSession();
  const signIn = () => {
    authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
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
  <button aria-label="Sign In or Sign Out" class="btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90">
    <Icon class="text-[1.25rem]" icon="material-symbols:autorenew-rounded" />
  </button>
{:else if $session.data}
  <button
    aria-label="Sign Out"
    class="btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90"
    onclick={signOut}
  >
    <Icon class="text-[1.25rem]" icon="material-symbols:logout" />
  </button>
{:else}
  <button aria-label="Sign In" class="btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90" onclick={signIn}>
    <Icon class="text-[1.25rem]" icon="material-symbols:login" />
  </button>
{/if}
