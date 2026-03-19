import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-[16px] border border-brand-border bg-[rgba(16,7,12,0.96)] px-3.5 py-2.5 text-sm uppercase tracking-[0.08em] text-brand-cyan shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] placeholder:text-brand-muted/70 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
