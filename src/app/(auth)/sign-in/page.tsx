import { SignInView } from "@/modules/auth";

export default function SignInPage() {
  return <SignInView callbackUrl="/dashboard" />;
}
