import { initDb } from "@utils/db";
import { initAuth } from "@utils/auth";

export const onRequest = async (context, next) => {
  const env = (context.locals as any).runtime?.env;
  if (env?.DB) {
    initDb(env.DB);
    initAuth(env.DB);
  }
  return next();
};
