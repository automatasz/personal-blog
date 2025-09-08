<script lang="ts">
  import Icon from "@iconify/svelte";
  import { authClient } from "@utils/auth-client";
  import { navigate } from "astro:transitions/client";

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
          navigate("/");
        },
      },
    });
  };

  function togglePannel() {
    const panel = document.querySelector("#my-account-panel");
    panel?.classList.toggle("float-panel-closed");
  }
</script>

<div class="relative" role="menu" tabindex="-1">
  <button
    aria-label="My account settings"
    role="menuitem"
    class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90"
    id="my-account-switch"
    onclick={togglePannel}
  >
    <div class="absolute" aria-label="Manage account">
      <Icon class="text-[1.25rem]" icon="material-symbols:person-rounded" />
    </div>
  </button>

  <div id="my-account-panel" class="hidden lg:block float-panel-closed absolute transition top-11 -right-2 pt-5">
    <div class="card-base float-panel p-2">
      <button
        aria-label="Sign In or Sign Out"
        class="flex transition whitespace-nowrap items-center !justify-start w-full dark:text-white/75 text-black/75 rounded-lg h-9 px-3 font-medium mb-0.5 cursor-default"
      >
        My Account
      </button>
      {#if $session.isPending || $session.isRefetching}
        <button
          aria-label="Sign In or Sign Out"
          class="flex transition whitespace-nowrap items-center !justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95 mb-0.5"
        >
          <Icon class="text-[1.25rem] mr-3" icon="material-symbols:autorenew-rounded" />
          Loading
        </button>
      {:else if $session.data}
        <button
          aria-label="Profile"
          class="flex transition whitespace-nowrap items-center !justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95 mb-0.5"
          onclick={() => navigate("/keyworder")}
        >
          <Icon class="text-[1.25rem] mr-3" icon="material-symbols:person-rounded" />
          {$session.data.user.email}
        </button>
        <button
          aria-label="Sign Out"
          class="flex transition whitespace-nowrap items-center !justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95 mb-0.5"
          onclick={signOut}
        >
          <Icon class="text-[1.25rem] mr-3" icon="material-symbols:logout" />
          Sign Out
        </button>
      {:else}
        <button
          aria-label="Sign In"
          class="flex transition whitespace-nowrap items-center !justify-start w-full btn-plain scale-animation rounded-lg h-9 px-3 font-medium active:scale-95 mb-0.5"
          onclick={signIn}
        >
          <Icon class="text-[1.25rem] mr-3" icon="material-symbols:login" />
          Sign In
        </button>
      {/if}
    </div>
  </div>
</div>
