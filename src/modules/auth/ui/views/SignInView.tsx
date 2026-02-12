"use client";

import { authClient } from "@/lib/auth-client";
import { AuthFooter } from "../components/AuthFooter";
import { AuthHeader } from "../components/AuthHeader";
import { SocialButton } from "../components/SocialButton";
import { AuthLayout } from "../layouts/AuthLayout";

interface SignInViewProps {
  callbackUrl?: string;
}

export function SignInView({ callbackUrl }: SignInViewProps) {
  const handleGoogleSignIn = () => {
    authClient.signIn.social({
      provider: "google",
      callbackURL: callbackUrl,
    });
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        <AuthHeader
          title="WELCOME"
          subtitle="Sign in to your account"
          showDivider
        />

        <div className="space-y-6">
          <SocialButton onClick={handleGoogleSignIn} />
        </div>

        <AuthFooter />
      </div>
    </AuthLayout>
  );
}
