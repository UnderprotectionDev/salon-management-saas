"use client";

import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AuthInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "className"> {
  icon: "mail" | "lock";
  showPasswordToggle?: boolean;
  className?: string;
}

const iconMap = {
  mail: MailIcon,
  lock: LockIcon,
};

export function AuthInput({
  icon,
  showPasswordToggle = false,
  className,
  ...props
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const Icon = iconMap[icon];
  const isPassword = icon === "lock";

  return (
    <div className={cn("relative", className)}>
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        type={isPassword && !showPassword ? "password" : "text"}
        className="pl-10 pr-10 h-11 font-mono text-sm"
        {...props}
      />
      {isPassword && showPasswordToggle && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOffIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </button>
      )}
    </div>
  );
}
