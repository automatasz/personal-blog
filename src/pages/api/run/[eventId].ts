import type { APIRoute } from "astro";
import { auth } from "@utils/auth";
import { INNGEST_API_URL, INNGEST_SIGNING_KEY } from "astro:env/server";

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
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

    if (!params.eventId) {
      return new Response(JSON.stringify({ error: "No event id provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const response = await fetch(`${INNGEST_API_URL}/v1/events/${params.eventId}/runs`, {
      headers: {
        Authorization: `Bearer ${INNGEST_SIGNING_KEY}`,
      },
    });

    const result = await response.json();

    console.log("result from api", params.eventId, result);

    return new Response(JSON.stringify(result), {
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
