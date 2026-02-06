import { maybeAuthedQuery } from "./lib/functions";

// Returns the current user if authenticated, null otherwise
// Does NOT throw if user is not authenticated
export const getCurrentUser = maybeAuthedQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.user;
  },
});
