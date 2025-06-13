import { serve } from "inngest/astro";
import { inngest, functions } from "@/inngest";

export const prerender = false;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});