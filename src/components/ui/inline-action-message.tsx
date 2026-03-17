import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InlineActionMessageProps = {
  variant?: "error" | "success" | "info";
  message: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
};

const variantClasses: Record<NonNullable<InlineActionMessageProps["variant"]>, string> = {
  error: "border-brand-magenta/45 bg-[rgba(255,79,216,0.12)] text-brand-ink shadow-neon",
  success: "border-brand-cyan/45 bg-[rgba(73,246,255,0.12)] text-brand-ink shadow-neon",
  info: "border-brand-primary/40 bg-[rgba(248,239,0,0.08)] text-brand-ink shadow-neon"
};

export function InlineActionMessage({
  variant = "error",
  message,
  retryLabel = "Повторить",
  onRetry,
  className
}: InlineActionMessageProps) {
  return (
    <div className={cn("rounded-[18px] border px-3 py-2 text-sm", variantClasses[variant], className)}>
      <div className="flex items-center justify-between gap-3">
        <div>{message}</div>
        {onRetry ? (
          <Button variant="secondary" className="h-8 rounded-[12px] px-3 text-xs" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
