"use client";

import Link from "next/link";
import { Mic2, Music2, Radio, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

import { SongsFullPlayerModal } from "@/components/songs/songs-full-player-modal";
import { SongsMiniPlayerDock } from "@/components/songs/songs-mini-player-dock";
import { SongsPlaybackProvider } from "@/components/songs/songs-playback-provider";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/songs", label: "Workspace", icon: Music2 },
  { href: "/songs/record", label: "Record", icon: Mic2 },
  { href: "/songs/archive", label: "Archive", icon: Radio }
] as const;

export function MusicAppShell({ children }: { children: React.ReactNode }) {
  return (
    <SongsPlaybackProvider>
      <MusicShellContent>{children}</MusicShellContent>
    </SongsPlaybackProvider>
  );
}

function MusicShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSongsRoute = pathname.startsWith("/songs");

  return (
    <div className={cn("min-h-screen", isSongsRoute ? "pb-40 md:pb-32" : "pb-24")}>
      <header className="sticky top-0 z-40 border-b border-brand-border/70 bg-[rgba(7,11,20,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/songs" className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-brand-border bg-brand-panel shadow-neon">
              <Sparkles className="h-5 w-5 text-brand-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-[var(--font-display)] text-sm uppercase tracking-[0.22em] text-brand-cyan">Cyberaudio</p>
              <p className="truncate text-xs text-brand-muted">Track capture, versioning and release archive</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                    active
                      ? "border-brand-primary bg-brand-primary text-[#060810] shadow-[0_0_24px_rgba(248,239,0,0.28)]"
                      : "border-brand-border bg-brand-panel text-brand-ink hover:border-brand-cyan hover:text-brand-cyan"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-8">{children}</main>

      <SongsMiniPlayerDock />
      <SongsFullPlayerModal />

      <div className="fixed inset-x-0 bottom-4 z-40 px-4 md:hidden">
        <nav className="mx-auto flex max-w-md items-center justify-between rounded-[26px] border border-brand-border bg-[rgba(14,22,40,0.94)] px-3 py-2 shadow-neon backdrop-blur-xl">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex min-w-[88px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] uppercase tracking-[0.12em] transition",
                  active ? "bg-brand-primary text-[#060810]" : "text-brand-muted hover:text-brand-cyan"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
