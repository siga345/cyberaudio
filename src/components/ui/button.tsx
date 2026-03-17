import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = {
  base:
    "inline-flex items-center justify-center gap-2 rounded-[16px] border px-4 py-2 text-sm font-medium tracking-[0.04em] transition disabled:cursor-not-allowed disabled:opacity-45",
  primary:
    "border-brand-primary bg-brand-primary text-[#060810] shadow-[0_0_24px_rgba(248,239,0,0.22)] hover:translate-y-[-1px] hover:bg-[#fff36b]",
  secondary:
    "border-brand-border bg-[rgba(14,22,40,0.9)] text-brand-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-brand-cyan hover:bg-[rgba(18,28,52,0.96)] hover:text-brand-cyan",
  ghost: "border-transparent bg-transparent text-brand-muted hover:border-brand-border hover:bg-[rgba(73,246,255,0.08)] hover:text-brand-ink"
};

export type ButtonVariant = keyof typeof buttonVariants;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants.base, buttonVariants[variant], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
