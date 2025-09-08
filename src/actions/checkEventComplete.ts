import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { checkIfAdminAndGetUserId } from "@utils/actions";
import { db } from "@utils/db";
import { INNGEST_API_URL, INNGEST_SIGNING_KEY } from "astro:env/server";

export const checkEventComplete = defineAction({
  accept: "json",
  input: z.object({
    batchId: z.string().uuid(),
  }),
  handler: async (input, context) => {
    const userId = await checkIfAdminAndGetUserId(context.request.headers);
    const results = await db
      .withSchema("keyworder")
      .selectFrom("description")
      .select(["description.job_id", "description.user_id"])
      .where("batch_id", "=", input.batchId)
      .where("user_id", "=", userId)
      .execute();

    const eventPromises = results.map(description => getIsRunComplete(description.job_id));
    const events = await Promise.all(eventPromises);
    return {
      complete: events.length > 0 && events.every(event => event),
    };
  },
});

async function getIsRunComplete(eventId: string) {
  const response = await fetch(`${INNGEST_API_URL}/v1/events/${eventId}/runs`, {
    headers: {
      Authorization: `Bearer ${INNGEST_SIGNING_KEY}`,
    },
  });
  const result = await response.json();

  return result.data[0]?.status === "Completed";
}
