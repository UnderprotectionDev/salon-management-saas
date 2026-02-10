"use client";

import {
  BarChart3,
  Calendar,
  CalendarDays,
  ChevronUp,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Scissors,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import {
  OrganizationProvider,
  OrganizationSwitcher,
  useOrganization,
} from "@/modules/organization";
import { GracePeriodBanner, SuspendedOverlay } from "@/modules/billing";
import { NotificationBell } from "@/modules/notifications";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Calendar",
    icon: CalendarDays,
    href: "/calendar",
  },
  {
    title: "Staff",
    icon: Users,
    href: "/staff",
  },
  {
    title: "Appointments",
    icon: Calendar,
    href: "/appointments",
  },
  {
    title: "Services",
    icon: Scissors,
    href: "/services",
  },
  {
    title: "Customers",
    icon: UserRound,
    href: "/customers",
  },
  {
    title: "Reports",
    icon: BarChart3,
    href: "/reports",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
  {
    title: "Billing",
    icon: CreditCard,
    href: "/billing",
  },
];

function AuthenticatedLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const {
    activeOrganization,
    organizations,
    setActiveOrganization,
    isLoading,
  } = useOrganization();

  const { data: session } = authClient.useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Find organization by slug and set as active
  useEffect(() => {
    if (isLoading || !organizations.length) return;

    const org = organizations.find((o) => o.slug === slug);
    if (org && activeOrganization?.slug !== slug) {
      setActiveOrganization(org);
    } else if (!org && organizations.length > 0) {
      // Redirect to first org if slug doesn't match
      setIsRedirecting(true);
      router.push(`/${organizations[0].slug}/dashboard`);
    }
  }, [
    slug,
    organizations,
    activeOrganization,
    isLoading,
    setActiveOrganization,
    router,
  ]);

  // Loading state
  if (isLoading || isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // No organization found
  if (!activeOrganization && !isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Organization not found</h2>
          <p className="text-muted-foreground">
            The salon you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild className="mt-4">
            <Link href="/onboarding">Create a Salon</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      router.push("/sign-in");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b p-4">
          <OrganizationSwitcher />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={`/${slug}${item.href}`}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="h-auto py-2">
                    <Avatar className="size-8">
                      <AvatarFallback>
                        {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">
                        {session?.user?.name ?? "User"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {session?.user?.email}
                      </div>
                    </div>
                    <ChevronUp className="size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href={`/${slug}/settings`}>
                      <Settings className="mr-2 size-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-4 lg:px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1" />
          <NotificationBell />
        </header>
        <GracePeriodBanner />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
        <SuspendedOverlay />
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrganizationProvider>
      <AuthenticatedLayoutContent>{children}</AuthenticatedLayoutContent>
    </OrganizationProvider>
  );
}
