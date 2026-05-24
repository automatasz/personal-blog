import { initDb } from "@utils/db";

export const onRequest = async (context, next) => {
  const env = (context.locals as any).runtime?.env;
  if (env?.DB) {
    initDb(env.DB);
  }
  return next();
};
