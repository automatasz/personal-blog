import { ActionError } from "astro:actions";
import { auth } from "./auth";

export async function checkIfAdminAndGetUserId(headers: Headers) {
  const session = await auth.api.getSession({ headers });

  if (!session?.session) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in",
    });
  }

  if (session.user.role !== "admin") {
    throw new ActionError({
      code: "FORBIDDEN",
      message: "You must have access to this feature",
    });
  }

  return session.user.id;
}
