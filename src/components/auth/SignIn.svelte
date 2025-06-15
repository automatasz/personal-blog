<script lang="ts">
  import { authClient } from "@utils/auth-client";
  const session = authClient.useSession();
  const signIn = () => {
    authClient.signIn.social({
      provider: "google",
      callbackURL: "/keyworder/",
      errorCallbackURL: "/error/",
      newUserCallbackURL: "/keyworder/",
    });
  };

  const signOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/keyworder/";
        },
      },
    });
  };
</script>

{#if $session.isPending || $session.isRefetching}
  <p class="text-75 mt-2">Loading...</p>
{/if}
{#if !$session.isPending && !$session.isRefetching && $session.data?.user.id}
  <button class="btn-regular rounded-lg active:scale-90 p-3 mt-2" onclick={signOut}>Sign out</button>
{/if}
{#if !$session.isPending && !$session.isRefetching && !$session.data?.user.id}
  <p class="text-75 mt-2">To use Keyworder, you must be signed in.</p>
  <button class="btn-regular rounded-lg active:scale-90 p-3 mt-2" onclick={signIn}>Sign in with Google</button>
{/if}
