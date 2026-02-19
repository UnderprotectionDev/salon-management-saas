import { Polar } from "@convex-dev/polar";
import { ConvexError } from "convex/values";
import { api, components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { ErrorCode } from "./lib/functions";

export const polar: Polar<DataModel, { monthly: string; yearly: string }> =
  new Polar(components.polar, {
    getUserInfo: async (ctx): Promise<{ userId: string; email: string }> => {
      const user = await ctx.runQuery(api.users.getCurrentUser);
      if (!user) {
        throw new ConvexError({
          code: ErrorCode.UNAUTHENTICATED,
          message: "User not authenticated",
        });
      }
      if (!user.email) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "User email is required for Polar integration",
        });
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
export const changeCurrentSubscription = polarApi.changeCurrentSubscription;
export const generateCustomerPortalUrl = polarApi.generateCustomerPortalUrl;
export const getConfiguredProducts = polarApi.getConfiguredProducts;
export const listAllProducts = polarApi.listAllProducts;
