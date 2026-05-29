import { auth, initAuth } from "@utils/auth";
import { GOOGLE_AUTH_CLIENT_ID, GOOGLE_AUTH_CLIENT_SECRET, CF_PAGES_URL } from "astro:env/server";
import type { APIRoute } from "astro";

export const prerender = false;

let initialized = false;

async function ensureAuth() {
  if (initialized) return;
  const { env } = await import("cloudflare:workers");
  initAuth(env.DB, {
    GOOGLE_AUTH_CLIENT_ID,
    GOOGLE_AUTH_CLIENT_SECRET,
    CF_PAGES_URL,
  });
  initialized = true;
}

export const ALL: APIRoute = async (ctx) => {
  await ensureAuth();
  const req = new Request(ctx.request, {
    headers: { ...Object.fromEntries(ctx.request.headers), "x-forwarded-for": ctx.clientAddress },
  });
  return auth.handler(req);
};
