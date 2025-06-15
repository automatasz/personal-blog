import { inngest } from "@/inngest";
import type { APIRoute } from "astro";
import { OpenAI } from "openai";
import { OPENAI_API_KEY } from "astro:env/server";
import { auth } from "@utils/auth";

export const prerender = false;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (session.user.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const uploadedFile = await openai.files.create({
      file,
      purpose: "user_data",
    });

    const response = await inngest.send({
      name: "keyworder/image.describe",
      data: {
        fileId: uploadedFile.id,
        userId: session.user.id,
      },
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error processing image:", error);
    return new Response(JSON.stringify({ error: "Failed to process image" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
