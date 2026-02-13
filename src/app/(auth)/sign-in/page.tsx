import { SignInView } from "@/modules/auth/ui";

type SearchParams = Promise<{ callbackUrl?: string }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { callbackUrl } = await searchParams;

  // Validate callbackUrl is a relative path to prevent open redirects
  const isValidCallback =
    callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//");
  const safeCallbackUrl = isValidCallback ? callbackUrl : "/dashboard";

  return <SignInView callbackUrl={safeCallbackUrl} />;
}
