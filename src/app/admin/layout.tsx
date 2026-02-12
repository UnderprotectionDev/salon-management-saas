"use client";

import { useConvexAuth, useQuery } from "convex/react";
import {
  BarChart3,
  Building2,
  LogOut,
  ScrollText,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { api } from "../../../convex/_generated/api";

const menuItems = [
  { title: "Dashboard", icon: BarChart3, href: "/admin" },
  { title: "Organizations", icon: Building2, href: "/admin/organizations" },
  { title: "Users", icon: Users, href: "/admin/users" },
  { title: "Action Log", icon: ScrollText, href: "/admin/logs" },
];

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { data: session } = authClient.useSession();
  const isSuperAdmin = useQuery(
    api.admin.checkIsSuperAdmin,
    isAuthenticated ? {} : "skip",
  );

  // Loading
  if (isSuperAdmin === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Not a superadmin — redirect
  if (isSuperAdmin === false) {
    router.push("/dashboard");
    return null;
  }

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b p-4">
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-red-500" />
            <span className="font-semibold">SuperAdmin</span>
            <Badge variant="destructive" className="ml-auto text-xs">
              Admin
            </Badge>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                    >
                      <Link href={item.href}>
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
              <SidebarMenuButton asChild>
                <Link href="/dashboard">
                  <LogOut className="size-4" />
                  <span>Exit Admin</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-4 lg:px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarFallback>
                {session?.user?.name?.[0]?.toUpperCase() ?? "A"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              {session?.user?.email}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
