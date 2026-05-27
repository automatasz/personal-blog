import { betterAuth } from "better-auth";
import { D1Dialect } from "kysely-d1";

let _auth: ReturnType<typeof betterAuth> | undefined;

interface AuthConfig {
  GOOGLE_AUTH_CLIENT_ID: string;
  GOOGLE_AUTH_CLIENT_SECRET: string;
  CF_PAGES_URL?: string;
}

export function initAuth(d1: unknown, config: AuthConfig) {
  if (_auth) return;
  _auth = betterAuth({
    database: {
      dialect: new D1Dialect({ database: d1 as any }),
      type: "sqlite",
    },
    user: {
      modelName: "user",
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "user",
          input: false,
        },
      },
    },
    session: {
      modelName: "session",
      cookieCache: {
        enabled: true,
        maxAge: 300,
      },
    },
    account: {
      modelName: "account",
    },
    verification: {
      modelName: "verification",
    },
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: {
        clientId: config.GOOGLE_AUTH_CLIENT_ID,
        clientSecret: config.GOOGLE_AUTH_CLIENT_SECRET,
      },
    },
    trustedOrigins: ["http://localhost:4321", "http://lievono:4321"].concat(config.CF_PAGES_URL ? [`https://${config.CF_PAGES_URL}`] : []),
  });
}

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_, prop) {
    if (!_auth) throw new Error("Auth not initialized. Call initAuth() first.");
    const value = (_auth as any)[prop];
    return typeof value === "function" ? value.bind(_auth) : value;
  },
});
