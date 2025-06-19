import { UPLOADTHING_TOKEN } from "astro:env/server";
import { UTApi } from "uploadthing/server";

export const uploadthing = new UTApi({
  token: UPLOADTHING_TOKEN,
});
