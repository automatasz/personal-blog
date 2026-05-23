import { betterAuth } from "better-auth";
import { GOOGLE_AUTH_CLIENT_ID, GOOGLE_AUTH_CLIENT_SECRET, CF_PAGES_URL } from "astro:env/server";
import { dialect } from "@utils/db";

export const auth = betterAuth({
  database: {
    dialect,
    type: "postgres",
  },
  user: {
    modelName: "keyworder.user",
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "user",
        input: false, // don't allow user to set role
      },
    },
  },
  session: {
    modelName: "keyworder.session",
    // performance improvements
    cookieCache: {
      enabled: true,
      maxAge: 300, // cache duration in seconds
    },
  },
  account: {
    modelName: "keyworder.account",
  },
  verification: {
    modelName: "keyworder.verification",
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: GOOGLE_AUTH_CLIENT_ID,
      clientSecret: GOOGLE_AUTH_CLIENT_SECRET,
    },
  },
  trustedOrigins: ["http://localhost:4321", "http://lievono:4321"].concat(CF_PAGES_URL ? [`https://${CF_PAGES_URL}`] : []),
});
