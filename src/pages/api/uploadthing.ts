import { createRouteHandler } from "uploadthing/server";
import { UPLOADTHING_TOKEN } from "astro:env/server";

import { ourFileRouter } from "@utils/storage";

export const prerender = false;

const handlers = createRouteHandler({
  router: ourFileRouter,
  config: {
    token: UPLOADTHING_TOKEN,
  },
});
export { handlers as GET, handlers as POST };
