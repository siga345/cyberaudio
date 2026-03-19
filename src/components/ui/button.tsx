import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = {
  base:
    "inline-flex items-center justify-center gap-2 rounded-[16px] border px-4 py-2.5 text-[11px] uppercase tracking-[0.22em] transition disabled:cursor-not-allowed disabled:opacity-45",
  primary:
    "border-brand-primary/80 bg-[linear-gradient(180deg,#fff56b,#ffdf00)] text-[#10070d] shadow-[0_12px_30px_rgba(255,230,0,0.14)] hover:brightness-105",
  secondary:
    "border-brand-border bg-[linear-gradient(180deg,rgba(26,8,15,0.96),rgba(10,5,10,0.98))] text-brand-cyan shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-brand-cyan/40 hover:bg-[rgba(34,10,18,0.98)]",
  ghost: "border-transparent bg-transparent text-brand-muted hover:border-brand-border hover:bg-white/5 hover:text-brand-cyan"
};

export type ButtonVariant = keyof typeof buttonVariants;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn("font-[var(--font-body)]", buttonVariants.base, buttonVariants[variant], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
