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
  <button
    aria-label="Sign In or Sign Out"
    class="btn-regular rounded-lg active:scale-90 py-3 px-4 cursor-pointer grow flex items-center gap-2"
  >
    <Icon class="text-[1.25rem] animate-spin" icon="material-symbols:autorenew-rounded" />
    Loading
  </button>
{:else if $session.data}
  <button
    aria-label="Sign Out"
    class="btn-ghost rounded-lg active:scale-90 py-2.5 px-4 cursor-pointer flex items-center gap-2 group transition-all"
    onclick={signOut}
  >
    <Icon class="text-[1.25rem] transition-transform duration-300 group-hover:-translate-x-0.5" icon="material-symbols:logout" />
    <span>Sign Out</span>
  </button>
{:else}
  <button
    aria-label="Sign In"
    class="btn-regular rounded-lg active:scale-90 py-3 px-6 cursor-pointer flex items-center gap-2 group transition-all"
    onclick={signIn}
  >
    <Icon class="text-[1.25rem] transition-transform duration-300 group-hover:translate-x-0.5" icon="material-symbols:login" />
    <span>Sign In with Google</span>
  </button>
{/if}
