---
name: betterauth-nextjs-convex
description: Comprehensive guide for setting up Better Auth authentication with Convex and Next.js using Bun. Covers Local Component installation method, schema generation with Bun, SSR patterns, server actions, and complete authentication flows. This skill should be used when configuring authentication in a Convex + Next.js project with Bun as the package manager.
---

# Better Auth + Convex + Next.js (with Bun)

## Overview

This skill provides comprehensive guidance for integrating Better Auth authentication with Convex backend and Next.js framework using Bun as the package manager. It covers the Local Component installation method with complete setup process from installation to SSR-compatible authentication flows using Next.js App Router.

## When to Use This Skill

- Setting up authentication in a new Convex + Next.js project with Bun
- Troubleshooting Better Auth configuration issues
- Implementing sign up, sign in, or sign out flows
- Configuring SSR authentication with server components
- Adding authenticated server functions and actions
- Understanding the auth provider hierarchy in Next.js App Router
- Generating and maintaining auth schema with Bun
- Working with Better Auth API methods in Convex functions

## Installation Method

This guide uses the **Local Component** installation method as recommended by official Convex documentation:

- Install as local Convex component
- Full schema control via `@better-auth/cli`
- Complete customization capabilities
- Better integration with Bun
- Follows official Convex + Better Auth patterns

## Quick Reference

### Required Packages

```bash
bun add convex@latest @convex-dev/better-auth
bun add better-auth@1.4.9 --exact
bun add -d @types/node
```

### Environment Variables

**Convex deployment** (via CLI):

```bash
bunx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
bunx convex env set SITE_URL http://localhost:3000
```

**Additional environment variables for OAuth (if needed):**

```bash
bunx convex env set GITHUB_CLIENT_ID your_github_client_id
bunx convex env set GITHUB_CLIENT_SECRET your_github_client_secret
```

> Important: Environment variables used by Better Auth instance should be set via Convex CLI or dashboard, NOT in .env.local, since the Better Auth instance runs on Convex.

**.env.local** (for Next.js):

```bash
# Deployment used by `bunx convex dev`
CONVEX_DEPLOYMENT=dev:adjective-animal-123 # team: team-name, project: project-name

NEXT_PUBLIC_CONVEX_URL=https://adjective-animal-123.convex.cloud

# Same as NEXT_PUBLIC_CONVEX_URL but ends in .site
NEXT_PUBLIC_CONVEX_SITE_URL=https://adjective-animal-123.convex.site

# Your local site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### File Structure

| File                                 | Purpose                              |
| ------------------------------------ | ------------------------------------ |
| `convex/convex.config.ts`            | Register local Better Auth component |
| `convex/auth.config.ts`              | Configure auth provider              |
| `convex/betterAuth/convex.config.ts` | Component definition                 |
| `convex/betterAuth/auth.ts`          | Better Auth instance + options       |
| `convex/betterAuth/schema.ts`        | Generated schema (via Bun CLI)       |
| `convex/betterAuth/adapter.ts`       | Export adapter functions             |
| `convex/http.ts`                     | Register auth HTTP routes            |
| `lib/auth-client.ts`                 | Client-side auth utilities           |
| `lib/auth-server.ts`                 | Server-side auth utilities           |

| `app/api/auth/[...all]/
route.ts` | Proxy auth requests to Convex |
| `app/layout.tsx` | Root layout with auth provider + initial token |
| `components/ConvexClientProvider.tsx` | Convex Better Auth Provider component |

## Installation Guide

### Prerequisites

1. Create a Convex project:

```bash
bun create convex@latest
# Choose user authentication: > none
```

2. Keep Convex dev running during setup:

```bash
bunx convex dev
```

### Local Component Installation

### Step 1: Install Packages

```bash
bun add convex@latest @convex-dev/better-auth
bun add better-auth@1.4.9 --exact
bun add -d @types/node
```

> Note: @convex-dev/better-auth is maintained by Convex. For issues, visit convex-helpers repo

### Step 2: Set Environment Variables

Generate and set the Better Auth secret:

```bash
bunx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
```

Set your site URL:

```bash
bunx convex env set SITE_URL http://localhost:3000
```

Ensure `.env.local` exists with these variables (created by `bunx convex dev`):

```bash
CONVEX_DEPLOYMENT=dev:adjective-animal-123
NEXT_PUBLIC_CONVEX_URL=https://adjective-animal-123.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://adjective-animal-123.convex.site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Step 3: Add Auth Config

```tsx
// convex/auth.config.ts
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
```

### Step 4: Create Component Definition

```tsx
// convex/betterAuth/convex.config.ts
import { defineComponent } from "convex/server";

const component = defineComponent("betterAuth");

export default component;
```

### Step 5: Register Local Component

```tsx
// convex/convex.config.ts
import { defineApp } from "convex/server";
import betterAuth from "./betterAuth/convex.config";

const app = defineApp();
app.use(betterAuth);

export default app;
```

### Step 6: Create Better Auth Instance

```tsx
// convex/betterAuth/auth.ts
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import schema from "./schema";

// Better Auth Component
export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  {
    local: { schema },
    verbose: false,
  },
);

// Better Auth Options
export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    appName: "My App",
    baseURL: process.env.SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [convex({ authConfig })],
  } satisfies BetterAuthOptions;
};

// For `@better-auth/cli`
export const options = createAuthOptions({} as GenericCtx<DataModel>);

// Better Auth Instance
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};
```

### Step 7: Generate Schema with Bun

**This is the critical step!** Generate the schema using Bun:

```bash
bun x @better-auth/cli generate --config ./convex/betterAuth/auth.ts --output ./convex/betterAuth/schema.ts
```

> Important: Run this command whenever you modify your Better Auth configuration to update the schema.

The generated schema will look like this:

```tsx
// convex/betterAuth/schema.ts (generated - do not edit manually)
import { defineTable } from "convex/server";
import { v } from "convex/values";

export default {
  user: defineTable({
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  session: defineTable({
    userId: v.id("user"),
    expiresAt: v.number(),
    token: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_user_id", ["userId"]),

  account: defineTable({
    userId: v.id("user"),
    accountId: v.string(),
    providerId: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
  }).index("by_user_id", ["userId"]),

  verification: defineTable({
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
  }).index("by_identifier", ["identifier"]),
};
```

### Step 8: Export Adapter Functions

```tsx
// convex/betterAuth/adapter.ts
import { createApi } from "@convex-dev/better-auth";
import { createAuthOptions } from "./auth";
import schema from "./schema";

export const {
  create,
  findOne,
  findMany,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany,
} = createApi(schema, createAuthOptions);
```

## Common Configuration (Required)

### Create Better Auth Client

```tsx
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient()],
});
```

### Configure Next.js Server Utilities

```tsx
// lib/auth-server.ts
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});
```

### Mount HTTP Handlers

```tsx
// convex/http.ts
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./betterAuth/auth";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

export default http;
```

### Create Next.js Route Handler

```tsx
// app/api/auth/[...all]/route.ts
import { handler } from "@/lib/auth-server";

export const { GET, POST } = handler;
```

### Set Up Convex Client Provider

```tsx
// components/ConvexClientProvider.tsx
"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  );
}
```

### Configure Root Layout

```tsx
// app/layout.tsx
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { getToken } from "@/lib/auth-server";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = await getToken();

  return (
    <html lang="en">
      <body>
        <ConvexClientProvider initialToken={token}>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
```

## Essential Imports

```tsx
// Client-side
import { authClient } from "@/lib/auth-client";

// Server-side
import {
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
  isAuthenticated,
  preloadAuthQuery,
} from "@/lib/auth-server";

// Backend (Local Component)
import { authComponent, createAuth } from "./betterAuth/auth";

// React hooks
import { useQuery, useMutation } from "convex/react";
import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
```

## Server-Side Patterns

### SSR with preloadAuthQuery

Preload queries in server components for optimal performance:

```tsx
// app/(auth)/dashboard/page.tsx
import { preloadAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";
import Header from "./header";

const Page = async () => {
  const [preloadedUserQuery] = await Promise.all([
    preloadAuthQuery(api.auth.getCurrentUser),
    // Load multiple queries in parallel if needed
  ]);

  return (
    <div>
      <Header preloadedUserQuery={preloadedUserQuery} />
    </div>
  );
};

export default Page;
```

```tsx
// app/(auth)/dashboard/header.tsx
"use client";

import { usePreloadedAuthQuery } from "@convex-dev/better-auth/nextjs/client";
import { api } from "@/convex/_generated/api";
import type { Preloaded } from "convex/react";

export const Header = ({
  preloadedUserQuery,
}: {
  preloadedUserQuery: Preloaded<typeof api.auth.getCurrentUser>;
}) => {
  const user = usePreloadedAuthQuery(preloadedUserQuery);

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
    </div>
  );
};

export default Header;
```

### Server Actions with Auth

Call authenticated mutations from server actions:

```tsx
// app/actions.ts
"use server";

import { fetchAuthMutation } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";

export async function updatePassword({
  currentPassword,
  newPassword,
}: {
  currentPassword: string;
  newPassword: string;
}) {
  await fetchAuthMutation(api.users.updatePassword, {
    currentPassword,
    newPassword,
  });
}
```

### Protection Pattern

Protect pages using `isAuthenticated` helper:

```tsx
// app/(auth)/protected/page.tsx
import { isAuthenticated } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const hasToken = await isAuthenticated();

  if (!hasToken) {
    redirect("/sign-in");
  }

  return <div>Protected content</div>;
}
```

## Better Auth API Methods in Convex

Better Auth's `auth.api` methods run inside Convex functions since Convex is your backend:

```tsx
// convex/users.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { createAuth, authComponent } from "./betterAuth/auth";

export const updateUserPassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    await auth.api.changePassword({
      body: {
        currentPassword: args.currentPassword,
        newPassword: args.newPassword,
      },
      headers,
    });
  },
});
```

### Auth Check in Backend

```tsx
// convex/messages.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./betterAuth/auth";

export const sendMessage = mutation({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    // Create message with authenticated user
    await ctx.db.insert("messages", {
      content: args.content,
      userId: user.id,
    });
  },
});
```

### Example Auth Functions

```tsx
// convex/auth.ts
import { query } from "./_generated/server";
import { authComponent } from "./betterAuth/auth";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});

export const getUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return null;

    // Fetch additional user data
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user.id))
      .first();

    return { ...user, profile };
  },
});
```

## Client-Side Usage

### Using authClient

```tsx
// app/sign-in/page.tsx
"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const handleEmailSignIn = async () => {
    await authClient.signIn.email({
      email: "user@example.com",
      password: "password",
      callbackURL: "/dashboard",
    });
  };

  const handleGitHubSignIn = async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/dashboard",
    });
  };

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/sign-in";
        },
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Button onClick={handleEmailSignIn}>Sign in with Email</Button>
      <Button onClick={handleGitHubSignIn}>Sign in with GitHub</Button>
      <Button onClick={handleSignOut}>Sign Out</Button>
    </div>
  );
}
```

### Using Convex React Hooks

```tsx
// app/dashboard/page.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Dashboard() {
  const user = useQuery(api.auth.getCurrentUser);

  if (user === undefined) {
    return <div>Loading...</div>;
  }

  if (user === null) {
    return <div>Unauthorized</div>;
  }

  return (
    <div>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}
```

## Advanced Patterns

### Middleware Protection (Optional)

Protect routes using Next.js middleware:

```tsx
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("better-auth.session_token");

  if (!token) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
```

### Parallel Data Loading

```tsx
// app/dashboard/page.tsx
import { preloadAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";

export default async function Dashboard() {
  // Load multiple queries in parallel
  const [userQuery, messagesQuery, settingsQuery] = await Promise.all([
    preloadAuthQuery(api.auth.getCurrentUser),
    preloadAuthQuery(api.messages.list),
    preloadAuthQuery(api.settings.get),
  ]);

  return (
    <div>
      <UserHeader preloadedQuery={userQuery} />
      <MessageList preloadedQuery={messagesQuery} />
      <Settings preloadedQuery={settingsQuery} />
    </div>
  );
}
```

## Schema Generation with Bun

### Initial Schema Generation

After creating your Better Auth instance configuration:

```bash
bun x @better-auth/cli generate --config ./convex/betterAuth/auth.ts --output ./convex/betterAuth/schema.ts
```

### Update Schema After Config Changes

Whenever you modify your Better Auth configuration (add plugins, change options, etc.), regenerate the schema:

```bash
bun x @better-auth/cli generate --config ./convex/betterAuth/auth.ts --output ./convex/betterAuth/schema.ts
```

### Schema Regeneration Scenarios

You need to regenerate the schema when:

1. Adding or removing authentication methods
2. Adding or removing Better Auth plugins
3. Changing user fields or session configuration
4. Adding OAuth providers
5. Modifying any `BetterAuthOptions` that affect the database schema

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Ensure all packages are installed: `bun install`
   - Check that `@types/node` is in devDependencies
   - Verify import paths match your file structure
2. **Authentication not persisting**
   - Check that `initialToken` is passed to `ConvexClientProvider`
   - Verify `getToken()` is called in root layout
   - Ensure cookies are enabled in browser
3. **CORS errors**
   - Verify `SITE_URL` is set correctly in Convex environment
   - Check that `baseURL` in auth config matches your site URL
   - Ensure `NEXT_PUBLIC_CONVEX_SITE_URL` is correct
4. **Hydration errors**
   - Ensure `'use client'` is added to components using hooks
   - Check that server and client rendering match
   - Verify preloaded queries are properly typed
5. **Session not found**
   - Make sure route handlers are at `app/api/auth/[...all]/route.ts`
   - Verify HTTP routes are registered in `convex/http.ts`
   - Check that `authComponent.registerRoutes` is called
6. **Schema generation errors**
   - Ensure auth config file path is correct
   - Check that output directory exists
   - Verify Better Auth options are valid
   - Try: `bun x @better-auth/cli generate --config ./convex/betterAuth/auth.ts --output ./convex/betterAuth/schema.ts`
7. **TypeScript errors in generated files**
   - Wait for Convex to regenerate types (keep `bunx convex dev` running)
   - Try restarting TypeScript server in your IDE
   - Check that all required files are created
8. **Bun-specific issues**
   - Clear Bun cache: `bun pm cache rm`
   - Reinstall dependencies: `rm -rf node_modules bun.lock && bun install`
   - Check Bun version: `bun --version` (should be 1.0.0+)

### Debug Checklist

- [ ] `bunx convex dev` is running
- [ ] All packages installed with correct versions (`bun install`)
- [ ] Environment variables set (both `.env.local` and Convex deployment)
- [ ] Component registered in `convex/convex.config.ts`
- [ ] Auth config exists at `convex/auth.config.ts`
- [ ] Better Auth instance created at `convex/betterAuth/auth.ts`
- [ ] Schema generated with Bun: `bun x @better-auth/cli generate ...`
- [ ] Adapter functions exported in `convex/betterAuth/adapter.ts`
- [ ] HTTP routes registered in `convex/http.ts`
- [ ] Route handler exists at `app/api/auth/[...all]/route.ts`
- [ ] Provider wraps app in root layout
- [ ] `initialToken` is passed to provider
- [ ] Import paths match local component structure

### Getting Help

- Check [Convex + Better Auth Examples](https://github.com/get-convex/convex-auth) on GitHub
- Review [Better Auth Documentation](https://www.better-auth.com/docs)
- Visit [Convex Discord](https://convex.dev/community) for community support
- Check [@convex-dev/better-auth Issues](https://github.com/xixixao/convex-helpers/tree/main/packages/better-auth)
- [Better Auth Convex Integration](https://www.better-auth.com/docs/integrations/convex)

## Bun-Specific Commands

### Package Management

```bash
# Install dependencies
bun install

# Add package
bun add package-name

# Add dev dependency
bun add -d package-name

# Add exact version (use --exact, not -exact)
bun add package-name@version --exact

# Remove package
bun remove package-name

# Update packages
bun update

# Clear cache
bun pm cache rm
```

### Convex Commands with Bun

```bash
# Start Convex dev server
bunx convex dev

# Deploy to production
bunx convex deploy

# Set environment variable
bunx convex env set VARIABLE_NAME value

# List environment variables
bunx convex env list

# Run migrations
bunx convex run functionName
```

### Better Auth CLI with Bun

```bash
# Generate schema
bun x @better-auth/cli generate --config ./convex/betterAuth/auth.ts --output ./convex/betterAuth/schema.ts

# Generate secret
bun x @better-auth/cli secret
```

## Key Configuration Notes

### Critical Points

1. **Always use Bun commands**: `bun`, `bunx`, `bun x` instead of npm/npx
2. **Schema generation is mandatory** for local component setup
3. **Keep `bunx convex dev` running** during
   development
4. **Environment variables** for Better Auth go in Convex, not `.env.local`
5. **`initialToken` prop** is required for SSR to work properly
6. **Import paths** must use `./betterAuth/auth` for
   local component

### Why Local Component?

The local component method is the recommended approach because it:

- Provides full control over schema generation and structure
- Allows complete customization of adapter functions
- Works seamlessly with Bun's module resolution
- Follows Convex's official documentation pattern
- Enables better debugging and customization
- Ensures compatibility with future Better Auth updates

## Additional Resources

- [Convex + Better Auth Next.js Guide](https://labs.convex.dev/better-auth/framework-guides/next)
- [Better Auth Convex Integration Docs](https://www.better-auth.com/docs/integrations/convex)
- [Better Auth CLI Documentation](https://www.better-auth.com/docs/cli)
- [@convex-dev/better-auth Package](https://www.npmjs.com/package/@convex-dev/better-auth)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Convex Documentation](https://docs.convex.dev/)
- [Bun Documentation](https://bun.sh/docs)
- [Better Auth Examples](https://github.com/better-auth/better-auth/tree/main/examples)

## Version Compatibility

Based on the current project setup:

- **Bun**: 1.0.0+ (recommended: latest)
- **Convex**: 1.31.7+ (current project uses 1.31.7)
- **Better Auth**: 1.4.9 (pinned version, use `--exact`)
- **Next.js**: 16+ (current project uses 16.1.6, App Router required)
- **React**: 19+ (current project uses 19.2.3)
- **TypeScript**: 5.0+ (current project uses TypeScript 5)
- **Node.js**: 20+ (for tooling compatibility)
