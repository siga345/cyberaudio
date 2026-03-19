"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { OverlayPortal } from "@/components/ui/overlay-portal";
import { cn } from "@/lib/utils";

type HudTopBarTab = {
  href: string;
  label: string;
  active?: boolean;
  icon?: ReactNode;
};

type HudTopBarProps = {
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Array<{ href?: string; label: string }>;
  tabs?: HudTopBarTab[];
  action?: ReactNode;
  stats?: Array<{ label: string; value: ReactNode; tone?: "cyan" | "yellow" | "red" }>;
  className?: string;
};

export function HudScreen({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("hud-screen space-y-5", className)}>{children}</section>;
}

export function HudTopBar({
  kicker,
  title,
  description,
  breadcrumbs = [],
  tabs = [],
  action,
  stats = [],
  className
}: HudTopBarProps) {
  return (
    <header className={cn("cyber-panel rounded-[28px] px-4 py-4 md:px-6 md:py-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {breadcrumbs.length ? (
            <nav className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-brand-muted">
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb.label}:${index}`} className="inline-flex min-w-0 items-center gap-2">
                  {crumb.href ? (
                    <Link href={crumb.href} className="truncate hover:text-brand-cyan">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="truncate text-brand-cyan">{crumb.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 ? <span className="text-brand-magenta">/</span> : null}
                </span>
              ))}
            </nav>
          ) : null}
          {kicker ? <p className="hud-kicker">{kicker}</p> : null}
          <h1 className="mt-2 font-[var(--font-display)] text-[clamp(2rem,5vw,4.25rem)] uppercase leading-[0.92] tracking-[0.08em] text-brand-cyan">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-muted">{description}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">{action}</div>
      </div>

      {stats.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="hud-panel rounded-[18px] px-3 py-2.5"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">{stat.label}</p>
              <p
                className={cn(
                  "mt-1 font-[var(--font-display)] text-xl uppercase tracking-[0.08em]",
                  stat.tone === "yellow"
                    ? "text-brand-primary"
                    : stat.tone === "red"
                      ? "text-brand-magenta"
                      : "text-brand-cyan"
                )}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {tabs.length ? (
        <nav className="mt-5 grid gap-2 border-t border-brand-border/80 pt-4 md:grid-flow-col md:auto-cols-fr">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "hud-panel flex min-h-[4rem] items-center gap-3 rounded-[18px] px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-brand-muted transition hover:text-brand-cyan",
                tab.active && "hud-tab-active border-[rgba(85,247,255,0.32)]"
              )}
            >
              {tab.icon ? <span className="grid h-6 w-6 place-items-center">{tab.icon}</span> : null}
              <span className="truncate">{tab.label}</span>
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export function HudPanel({
  title,
  kicker,
  description,
  action,
  children,
  className,
  contentClassName
}: {
  title?: ReactNode;
  kicker?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("hud-panel rounded-[24px] p-4 md:rounded-[28px] md:p-5", className)}>
      {(title || kicker || description || action) ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {kicker ? <p className="hud-kicker">{kicker}</p> : null}
            {title ? <h2 className="mt-1 font-[var(--font-display)] text-[1.3rem] uppercase tracking-[0.09em] text-brand-cyan">{title}</h2> : null}
            {description ? <p className="mt-2 text-sm leading-6 text-brand-muted">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export function HudChip({
  children,
  tone = "cyan",
  className
}: {
  children: ReactNode;
  tone?: "cyan" | "yellow" | "red" | "muted";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-[999px] border px-3 py-1 text-[10px] uppercase tracking-[0.18em]",
        tone === "yellow"
          ? "border-brand-primary/50 bg-brand-primary/10 text-brand-primary"
          : tone === "red"
            ? "border-brand-magenta/50 bg-brand-magenta/10 text-brand-magenta"
            : tone === "muted"
              ? "border-brand-border bg-white/5 text-brand-muted"
              : "border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan",
        className
      )}
    >
      {children}
    </span>
  );
}

export function HudDataRow({
  label,
  value,
  action,
  className
}: {
  label: ReactNode;
  value: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("hud-divider flex items-center justify-between gap-3 py-3", className)}>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-brand-muted">{label}</p>
        <p className="mt-1 truncate text-sm uppercase tracking-[0.12em] text-brand-cyan">{value}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function HudOverlayMenu({
  open,
  title,
  subtitle,
  onClose,
  children
}: {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[80] flex items-start justify-center bg-[rgba(2,0,7,0.82)] p-4 pt-20 backdrop-blur-md md:items-center md:p-8"
        onClick={onClose}
      >
        <div
          className="cyber-panel w-full max-w-3xl rounded-[28px] p-5 md:p-6"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="hud-kicker">Command Overlay</p>
          <h3 className="mt-2 font-[var(--font-display)] text-[1.8rem] uppercase tracking-[0.08em] text-brand-cyan">{title}</h3>
          {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted">{subtitle}</p> : null}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </OverlayPortal>
  );
}
