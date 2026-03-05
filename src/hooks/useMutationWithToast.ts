"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";
import { getConvexErrorMessage } from "@/lib/convex-error";
import type { FunctionReference } from "convex/server";

/**
 * Wraps a Convex mutation with automatic error toasting.
 * Returns a function that calls the mutation and shows toast on error.
 *
 * @example
 * const doSomething = useMutationWithToast(api.things.create);
 * await doSomething({ name: "foo" }); // shows toast.error on failure, re-throws
 *
 * @example With custom fallback message:
 * const doSomething = useMutationWithToast(api.things.create, {
 *   errorMessage: "Failed to create thing.",
 * });
 */
export function useMutationWithToast<
  // biome-ignore lint/suspicious/noExplicitAny: generic mutation reference
  T extends FunctionReference<"mutation", any, any, any>,
>(mutation: T, options?: { errorMessage?: string }) {
  const mutate = useMutation(mutation);

  return async (
    ...args: Parameters<typeof mutate>
  ): Promise<T["_returnType"]> => {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: forwarding generic args
      return await (mutate as any)(...args);
    } catch (error) {
      toast.error(getConvexErrorMessage(error, options?.errorMessage));
      throw error;
    }
  };
}
