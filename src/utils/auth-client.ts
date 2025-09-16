import { createAuthClient } from "better-auth/svelte";
import { createAuthClient as createAuthClientVanilla } from "better-auth/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@utils/auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const authClientVanilla = createAuthClientVanilla({
  plugins: [inferAdditionalFields<typeof auth>()],
});
