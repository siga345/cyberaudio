import * as React from "react";

import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-[16px] border border-brand-border bg-[rgba(9,15,28,0.92)] px-3 py-2 text-sm text-brand-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-[rgba(73,246,255,0.18)]",
        className
      )}
      {...props}
    />
  )
);
Select.displayName = "Select";
