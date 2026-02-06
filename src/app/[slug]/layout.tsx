"use client";

import {
  Calendar,
  ChevronUp,
  LayoutDashboard,
  LogOut,
  Scissors,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
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
import { OrganizationSwitcher, useOrganization } from "@/modules/organization";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
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
    disabled: true,
  },
  {
    title: "Services",
    icon: Scissors,
    href: "/services",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export default function SalonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const {
    activeOrganization,
    organizations,
    setActiveOrganization,
    isLoading,
  } = useOrganization();

  const { data: session } = authClient.useSession();

  // Find organization by slug and set as active
  useEffect(() => {
    if (isLoading || !organizations.length) return;

    const org = organizations.find((o) => o.slug === slug);
    if (org && activeOrganization?.slug !== slug) {
      setActiveOrganization(org);
    } else if (!org && organizations.length > 0) {
      // Redirect to first org if slug doesn't match
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
  if (isLoading) {
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
    await authClient.signOut();
    router.push("/sign-in");
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
                    <SidebarMenuButton
                      asChild
                      disabled={item.disabled}
                      tooltip={item.disabled ? "Coming soon" : undefined}
                    >
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
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
