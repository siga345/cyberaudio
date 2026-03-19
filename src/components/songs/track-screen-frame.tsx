"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { SamizdatBottomNav, SamizdatPaperStrip, SamizdatScreen, SamizdatTopBar } from "@/components/layout/samizdat-screen";
import { MenuGlyph, NotesGlyph, PlayGlyph, RecordGlyph, VersionsGlyph } from "@/components/songs/samizdat-icons";
import { trackTabHref, useTrackScreen } from "@/components/songs/track-screen-context";
import { cn } from "@/lib/utils";

type TrackTab = "notes" | "record" | "play" | "versions";

const tabIcon = {
  notes: <NotesGlyph />,
  record: <RecordGlyph />,
  play: <PlayGlyph />,
  versions: <VersionsGlyph />
} satisfies Record<TrackTab, ReactNode>;

type TrackScreenFrameProps = {
  tab: TrackTab;
  label: string;
  children: ReactNode;
  topAction?: ReactNode;
  title?: ReactNode;
  paperClassName?: string;
  contentClassName?: string;
  navItems?: Array<{
    href: string;
    label: string;
    icon: ReactNode;
    active?: boolean;
  }>;
};

export function TrackScreenFrame({
  tab,
  label,
  children,
  topAction,
  title,
  paperClassName,
  contentClassName,
  navItems
}: TrackScreenFrameProps) {
  const { trackId, track, isLoading, error } = useTrackScreen();
  const defaultNavItems = [
    { key: "notes", label: "Notes", href: trackTabHref(trackId, "notes"), icon: <NotesGlyph /> },
    { key: "record", label: "Record", href: trackTabHref(trackId, "record"), icon: <RecordGlyph /> },
    { key: "play", label: "Play", href: trackTabHref(trackId, "play"), icon: <PlayGlyph /> },
    { key: "versions", label: "Versions", href: trackTabHref(trackId, "versions"), icon: <VersionsGlyph /> }
  ] as const;

  return (
    <SamizdatScreen
      header={
        <SamizdatTopBar
          label={label}
          icon={tabIcon[tab]}
          action={
            topAction ?? (
              <Link
                href="/songs"
                className="grid h-9 w-9 place-items-center rounded-[12px] border border-white/12 bg-[rgba(255,255,255,0.03)] text-brand-cyan transition hover:border-white/22 hover:text-brand-primary"
                aria-label="Вернуться в библиотеку"
              >
                <MenuGlyph />
              </Link>
            )
          }
        />
      }
      footer={
        <SamizdatBottomNav
          items={
            navItems ??
            defaultNavItems.map((item) => ({
              href: item.href,
              label: item.label,
              icon: item.icon,
              active: item.key === tab
            }))
          }
        />
      }
    >
      <SamizdatPaperStrip className={cn("mb-5", paperClassName)}>
        {title ?? (isLoading ? "LOADING" : error ? "ERROR" : track?.title ?? "TRACK")}
      </SamizdatPaperStrip>
      <div className={cn("space-y-5", contentClassName)}>{children}</div>
    </SamizdatScreen>
  );
}
