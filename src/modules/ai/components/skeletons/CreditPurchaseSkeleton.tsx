import { Skeleton } from "@/components/ui/skeleton";

export function CreditPurchaseSkeleton() {
  return (
    <>
      <Skeleton className="h-[88px] w-full" />
      <Skeleton className="h-[88px] w-full" />
      <Skeleton className="h-[88px] w-full" />
    </>
  );
}
