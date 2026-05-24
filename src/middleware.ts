import { initDb } from "@utils/db";
import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async (context, next) => {
  const env = (context.locals as any).runtime?.env;
  if (env?.DB) {
    initDb(env.DB);
  }
  return next();
};
