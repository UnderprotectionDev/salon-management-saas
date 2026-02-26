import type { useQuery } from "convex/react";
import type { api } from "../../../../convex/_generated/api";

export type ProductDetail = NonNullable<
  ReturnType<typeof useQuery<typeof api.products.getDetail>>
>;
