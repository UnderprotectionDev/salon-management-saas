import { Polar } from "@convex-dev/polar";
import type { DataModel } from "./_generated/dataModel";
import { api, components } from "./_generated/api";

export const polar: Polar<DataModel, { monthly: string; yearly: string }> =
  new Polar(components.polar, {
    getUserInfo: async (ctx): Promise<{ userId: string; email: string }> => {
      const user = await ctx.runQuery(api.users.getCurrentUser);
      if (!user) {
        throw new Error("User not authenticated");
      }
      if (!user.email) {
        throw new Error("User email is required for Polar integration");
      }
      return {
        userId: user._id as string,
        email: user.email,
      };
    },
    products: {
      monthly: process.env.POLAR_PRODUCT_MONTHLY_ID ?? "",
      yearly: process.env.POLAR_PRODUCT_YEARLY_ID ?? "",
    },
  });

const polarApi = polar.api();
export const cancelCurrentSubscription = polarApi.cancelCurrentSubscription;
export const generateCustomerPortalUrl = polarApi.generateCustomerPortalUrl;
export const getConfiguredProducts = polarApi.getConfiguredProducts;
export const listAllProducts = polarApi.listAllProducts;
