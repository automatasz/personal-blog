import { initDb } from "@utils/db";

let initialized = false;

export const onRequest = async (context, next) => {
  if (!initialized) {
    try {
      const { env } = await import("cloudflare:workers");
      initDb(env.DB);
      initialized = true;
    } catch {
      // prerender — no runtime env available
    }
  }
  return next();
};