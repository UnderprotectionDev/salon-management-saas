import { SignInView } from "@/modules/auth/ui";

export default async function SignInPage() {
  return <SignInView callbackUrl="/dashboard" />;
}
