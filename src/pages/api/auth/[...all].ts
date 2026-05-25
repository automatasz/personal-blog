import { auth, initAuth } from "@utils/auth";
import { GOOGLE_AUTH_CLIENT_ID, GOOGLE_AUTH_CLIENT_SECRET, CF_PAGES_URL } from "astro:env/server";
import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
  initAuth(env.DB, {
    GOOGLE_AUTH_CLIENT_ID,
    GOOGLE_AUTH_CLIENT_SECRET,
    CF_PAGES_URL,
  });
  const req = new Request(ctx.request, {
    headers: { ...Object.fromEntries(ctx.request.headers), "x-forwarded-for": ctx.clientAddress },
  });
  return auth.handler(req);
};