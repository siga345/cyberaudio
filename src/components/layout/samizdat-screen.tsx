"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SamizdatScreenProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

type SamizdatTopBarProps = {
  label: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

type SamizdatPaperStripProps = {
  children: ReactNode;
  className?: string;
};

type SamizdatBottomNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
};

export function SamizdatScreen({ header, footer, children, className, bodyClassName }: SamizdatScreenProps) {
  return (
    <section className={cn("samizdat-screen shadow-neon", className)}>
      <div className={cn("relative z-10 flex min-h-[calc(100vh-9rem)] flex-col", bodyClassName)}>
        {header}
        <div className="flex-1 px-4 pb-4 pt-4">{children}</div>
        {footer}
      </div>
    </section>
  );
}

export function SamizdatTopBar({ label, icon, action, className }: SamizdatTopBarProps) {
  return (
    <div className={cn("samizdat-divider flex items-center justify-between gap-3 px-4 py-4", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[10px] border border-white/15 bg-[rgba(255,255,255,0.04)] text-brand-cyan">
            {icon}
          </span>
        ) : null}
        <p className="samizdat-fine-print text-brand-cyan">{label}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SamizdatPaperStrip({ children, className }: SamizdatPaperStripProps) {
  return (
    <div
      className={cn(
        "samizdat-paper-strip rounded-[2px] px-4 py-3 font-[var(--font-display)] text-[clamp(2rem,7vw,3.35rem)] font-black uppercase tracking-[-0.04em]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SamizdatSectionTitle({ children, className }: SamizdatPaperStripProps) {
  return <p className={cn("samizdat-fine-print text-brand-primary", className)}>{children}</p>;
}

export function SamizdatBottomNav({
  items,
  className,
  itemClassName
}: {
  items: SamizdatBottomNavItem[];
  className?: string;
  itemClassName?: string;
}) {
  return (
    <nav
      className={cn("mt-auto grid border-t border-white/14 bg-[rgba(10,10,9,0.94)]", className)}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex min-h-[4.8rem] flex-col items-center justify-center gap-2 border-r border-white/10 px-2 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-cyan transition last:border-r-0",
            item.active ? "text-brand-primary" : "text-brand-cyan/82 hover:text-brand-cyan",
            itemClassName
          )}
        >
          <span className="grid h-6 w-6 place-items-center">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
