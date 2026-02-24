import type { ReactNode } from "react";
import { SettingsNav } from "@/modules/settings/components/SettingsNav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your settings and preferences
        </p>
      </div>

      {/* Mobile: horizontal pill nav (visible < md) */}
      <div className="md:hidden">
        <SettingsNav />
      </div>

      {/* Desktop: sidebar + content (visible >= md) */}
      <div className="md:flex md:gap-8">
        <div className="hidden md:block">
          <div className="sticky top-6">
            <SettingsNav />
          </div>
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
