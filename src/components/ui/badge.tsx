import * as React from "react";

import { cn } from "@/lib/utils";

export const Badge = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border border-brand-border bg-[rgba(73,246,255,0.08)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-brand-cyan",
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";
