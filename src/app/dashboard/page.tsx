"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  BarChart3,
  Building2,
  Loader2,
  LogOut,
  Plus,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NiceAvatar, { genConfig } from "react-nice-avatar";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { OnboardingBanner, OnboardingWizard } from "@/modules/onboarding";
import { InvitationBanner, useOrganizations } from "@/modules/organization";
import {
  DashboardSkeleton,
  FavoriteSalonsSection,
  MyAppointmentsList,
  ProfilesSection,
} from "@/modules/user-dashboard";
import { api } from "../../../convex/_generated/api";

// =============================================================================
// Helper functions
// =============================================================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "staff":
      return "Staff";
    default:
      return role;
  }
}

// =============================================================================
// Main Dashboard Page
// =============================================================================

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const organizations = useOrganizations();
  const myAppointments = useQuery(
    api.appointmentUser.listForCurrentUser,
    user ? {} : "skip",
  );
  const isSuperAdmin = useQuery(
    api.admin.checkIsSuperAdmin,
    user ? {} : "skip",
  );
  const userProfile = useQuery(api.userProfile.get, user ? {} : "skip");
  const acceptConsent = useMutation(api.userProfile.acceptConsent);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Auto-create user profile with KVKK consent on first login
  // (user accepted by signing in — consent text shown on sign-in page)
  useEffect(() => {
    if (userProfile === null && user) {
      acceptConsent({}).catch(() => {
        // Silent fail — will retry on next render
      });
    }
  }, [userProfile, user, acceptConsent]);

  // Redirect to /welcome if onboarding not completed
  // Covers both: freshly created profile (from acceptConsent above)
  // and existing profile that hasn't completed onboarding
  useEffect(() => {
    if (
      userProfile &&
      !userProfile.onboardingCompleted &&
      !userProfile.onboardingDismissedAt
    ) {
      router.replace("/welcome");
    }
  }, [userProfile, router]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Dispatch event BEFORE sign out to skip queries immediately
      window.dispatchEvent(new Event("auth:signing-out"));

      // Small delay to allow React to process the state update
      await new Promise((resolve) => setTimeout(resolve, 50));

      await authClient.signOut();

      // Notify that sign out is complete
      window.dispatchEvent(new Event("auth:signed-out"));

      toast.success("Signed out successfully");
      router.push("/sign-in");
    } catch (_error) {
      toast.error("Failed to sign out");
      window.dispatchEvent(new Event("auth:signed-out"));
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    if (user === null) {
      router.replace("/sign-in");
    }
  }, [user, router]);

  // Show loading while:
  // - user query is loading (undefined)
  // - organizations query is loading (undefined)
  // - userProfile is loading (undefined) or being created (null → acceptConsent in progress)
  //   This prevents dashboard flash before /welcome redirect for new users
  if (
    user === undefined ||
    organizations === undefined ||
    userProfile === undefined ||
    userProfile === null
  ) {
    return <DashboardSkeleton />;
  }

  // If onboarding not complete, don't render dashboard (redirect effect handles it)
  if (!userProfile.onboardingCompleted && !userProfile.onboardingDismissedAt) {
    return <DashboardSkeleton />;
  }

  if (user === null) {
    return <DashboardSkeleton />;
  }

  const greeting = getGreeting();
  const _userInitial =
    user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto p-4 lg:p-6 space-y-6">
        {/* Welcome Header + Profile Card */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="size-12 rounded-full overflow-hidden shrink-0">
              <NiceAvatar
                style={{ width: "100%", height: "100%" }}
                shape="circle"
                {...(userProfile.avatarConfig ?? genConfig(user._id))}
              />
            </div>
            <div className="flex-1 space-y-1">
              <CardTitle className="text-xl">
                {greeting}, {user.name || "User"}!
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                {user.email}
                {user.emailVerified && (
                  <Badge variant="secondary" className="text-xs">
                    Verified
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <Button variant="destructive" size="sm" asChild>
                  <Link href="/admin">
                    <Shield className="mr-2 size-4" />
                    Admin Panel
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/stats">
                  <BarChart3 className="mr-2 size-4" />
                  My Stats
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="mr-2 size-4" />
                  Edit Profile
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 size-4" />
                )}
                Sign Out
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Onboarding Wizard */}
        {userProfile && (
          <OnboardingWizard
            open={showWizard}
            onOpenChange={setShowWizard}
            initialProfile={userProfile}
          />
        )}

        {/* Onboarding Banner */}
        {userProfile && (
          <OnboardingBanner
            profile={userProfile}
            onStartWizard={() => setShowWizard(true)}
          />
        )}

        {/* Pending Invitations */}
        <InvitationBanner />

        {/* Ana Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Content (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>My Appointments</CardTitle>
                <CardDescription>
                  Your upcoming and past appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upcoming">
                  <TabsList aria-label="Appointment tabs">
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="upcoming"
                    className="mt-4"
                    aria-live="polite"
                  >
                    <MyAppointmentsList
                      appointments={myAppointments}
                      filter="upcoming"
                    />
                  </TabsContent>
                  <TabsContent value="past" className="mt-4" aria-live="polite">
                    <MyAppointmentsList
                      appointments={myAppointments}
                      filter="past"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* My Salon Profiles */}
            <ProfilesSection />

            {/* My Favorite Salons - feature implemented below */}
            <FavoriteSalonsSection />
          </div>

          {/* Right Column - Quick Links */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/dashboard/stats">
                    <BarChart3 className="mr-2 size-4" />
                    View My Stats
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/dashboard/ai">
                    <Sparkles className="mr-2 size-4" />
                    AI Features
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* My Salons (For salon owners/staff) */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>My Salon</CardTitle>
              <CardDescription>Salon you own or work at</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {organizations.length === 0 ? (
              <Empty className="border rounded-lg">
                <EmptyMedia variant="icon">
                  <Building2 className="size-5" />
                </EmptyMedia>
                <EmptyTitle>No salons yet</EmptyTitle>
                <EmptyDescription>
                  Create your first salon to get started.
                </EmptyDescription>
                <Button asChild className="mt-2">
                  <Link href="/onboarding">
                    <Plus className="mr-2 size-4" />
                    Create Your First Salon
                  </Link>
                </Button>
              </Empty>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {organizations.map((org) => (
                  <Link key={org._id} href={`/${org.slug}/dashboard`}>
                    <Card className="hover:border-primary transition-colors cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10">
                            {org.logo ? (
                              <AvatarImage src={org.logo} alt={org.name} />
                            ) : (
                              <AvatarFallback>
                                <Building2 className="size-4" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">
                              {org.name}
                            </CardTitle>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {getRoleLabel(org.role)}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
