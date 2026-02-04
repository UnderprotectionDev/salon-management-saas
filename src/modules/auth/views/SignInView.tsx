"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AuthFooter } from "../components/AuthFooter";
import { AuthHeader } from "../components/AuthHeader";
import { SocialButton } from "../components/SocialButton";
import { AuthLayout } from "../layouts/AuthLayout";

interface SignInViewProps {
  callbackUrl?: string;
}

export function SignInView({ callbackUrl = "/dashboard" }: SignInViewProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        <AuthHeader
          title="WELCOME BACK"
          subtitle="Sign in to your account"
          showDivider
        />

        <div className="space-y-6">
          <SocialButton
            provider="google"
            onClick={handleGoogleSignIn}
            isLoading={isGoogleLoading}
          />

          <p className="text-center text-sm text-black/50">
            Don't have an account?{" "}
            <a
              href="/sign-up"
              className="font-medium underline underline-offset-4 text-black hover:text-primary transition-colors"
            >
              Sign up
            </a>
          </p>
        </div>

        <AuthFooter />
      </div>
    </AuthLayout>
  );
}
