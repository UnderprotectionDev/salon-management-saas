import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL;
if (!siteUrl) throw new Error("SITE_URL environment variable is required");

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
if (!betterAuthSecret)
  throw new Error("BETTER_AUTH_SECRET environment variable is required");

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!googleClientId || !googleClientSecret) {
  throw new Error(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required",
  );
}

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    secret: betterAuthSecret,
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    // Email/password disabled — Google OAuth only
    emailAndPassword: {
      enabled: false,
    },
    // OAuth Providers
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex({ authConfig }),
    ],
  });
};
