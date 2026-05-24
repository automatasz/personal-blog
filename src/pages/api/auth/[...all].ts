import { auth, initAuth } from "@utils/auth";
import { GOOGLE_AUTH_CLIENT_ID, GOOGLE_AUTH_CLIENT_SECRET, CF_PAGES_URL } from "astro:env/server";
import type { APIRoute } from "astro";

export const prerender = false;

export const ALL: APIRoute = async (ctx) => {
  const env = (ctx.locals as any).runtime?.env;
  if (env?.DB) {
    initAuth(env.DB, {
      GOOGLE_AUTH_CLIENT_ID,
      GOOGLE_AUTH_CLIENT_SECRET,
      CF_PAGES_URL,
    });
  }
  ctx.request.headers.set("x-forwarded-for", ctx.clientAddress);
  return auth.handler(ctx.request);
};
