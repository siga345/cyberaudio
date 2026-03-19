import * as React from "react";

import { cn } from "@/lib/utils";

export const Badge = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border border-brand-border bg-[rgba(255,62,89,0.08)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-brand-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";
