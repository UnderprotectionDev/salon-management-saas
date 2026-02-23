"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function TopNav() {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/sign-in");
  };

  return (
    <div className="border-b border-border flex justify-end">
      <button
        type="button"
        onClick={handleLogout}
        className="px-6 py-3 border-l border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-foreground hover:text-background transition-colors flex items-center gap-2"
      >
        LOGOUT
        <LogOut className="size-3" />
      </button>
    </div>
  );
}
