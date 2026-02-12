import { authedQuery } from "./lib/functions";

// Returns the current authenticated user
// Throws UNAUTHENTICATED if not logged in
export const getCurrentUser = authedQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.user;
  },
});
