"use client";

import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";

import { HudMenuGlyph } from "@/components/songs/hud-glyphs";
import { PlaybackIcon } from "@/components/songs/playback-icon";
import type { WorkspaceProjectNode } from "@/components/songs/workspace-types";
import { buildProjectCoverStyle } from "@/lib/project-cover-style";
import { playbackAccentButtonStyle } from "@/lib/songs-playback-helpers";
import { getProjectOpenHref } from "@/lib/songs-project-navigation";
import { resolveVersionTypeByStage } from "@/lib/songs-version-stage-map";

type WorkspaceProjectTileProps = {
  node: WorkspaceProjectNode;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onPlay?: () => void;
  playLoading?: boolean;
  menuContent?: ReactNode;
  tileProps?: HTMLAttributes<HTMLDivElement>;
  dragState?: "idle" | "dragging" | "drop-target" | "drop-invalid";
};

function getTrackStatusLabel(stageName: string | null | undefined) {
  if (!stageName) return "Без статуса";
  const versionType = resolveVersionTypeByStage({ id: 0, name: stageName });
  const statusByVersionType = {
    IDEA_TEXT: "Идея",
    DEMO: "Демо",
    ARRANGEMENT: "Продакшн",
    NO_MIX: "Без сведения",
    MIXED: "Сведение",
    MASTERED: "Мастеринг",
    RELEASE: "Релиз"
  } as const;
  return versionType ? statusByVersionType[versionType] : stageName;
}

function formatTrackCount(trackCount: number) {
  if (trackCount === 1) return "1 трек";
  if (trackCount > 1 && trackCount < 5) return `${trackCount} трека`;
  return `${trackCount} треков`;
}

export function WorkspaceProjectTile({
  node,
  menuOpen,
  onToggleMenu,
  onPlay,
  playLoading,
  menuContent,
  tileProps,
  dragState = "idle"
}: WorkspaceProjectTileProps) {
  const projectOpenHref = getProjectOpenHref({
    id: node.id,
    releaseKind: node.projectMeta.releaseKind ?? "ALBUM",
    singleTrackId: node.projectMeta.singleTrackId ?? null
  });
  const releaseKind = node.projectMeta.releaseKind ?? "ALBUM";
  const releaseLabel = releaseKind === "SINGLE" ? "Сингл" : "Альбом";
  const secondaryLabel =
    releaseKind === "SINGLE" && node.projectMeta.singleTrackId
      ? getTrackStatusLabel(node.projectMeta.singleTrackStageName)
      : formatTrackCount(node.projectMeta.trackCount || 0);
  const accent = playbackAccentButtonStyle({
    colorA: node.projectMeta.coverColorA || "#F8EF00",
    colorB: node.projectMeta.coverColorB || "#49F6FF"
  });
  const dragClasses =
    dragState === "dragging"
      ? "opacity-60 ring-2 ring-brand-ink/30"
      : dragState === "drop-target"
        ? "ring-2 ring-brand-cyan bg-[rgba(73,246,255,0.08)]"
        : dragState === "drop-invalid"
          ? "ring-2 ring-red-300"
          : "";

  return (
    <div
      {...tileProps}
      className={`rounded-2xl bg-transparent p-0 shadow-none transition hover:-translate-y-1 md:rounded-3xl ${dragClasses} ${tileProps?.className ?? ""}`}
    >
      <Link href={projectOpenHref} className="group block">
        <div className="relative">
          <div className="relative aspect-square overflow-hidden rounded-[24px] border border-brand-border/70 bg-[rgba(12,6,10,0.94)] shadow-[0_20px_55px_rgba(0,0,0,0.45)] transition-shadow group-hover:shadow-[0_26px_70px_rgba(0,0,0,0.65)]">
            <div
              className="absolute inset-0"
              style={buildProjectCoverStyle({
                releaseKind,
                coverType: node.projectMeta.coverType,
                coverImageUrl: node.projectMeta.coverImageUrl,
                coverPresetKey: node.projectMeta.coverPresetKey,
                coverColorA: node.projectMeta.coverColorA,
                coverColorB: node.projectMeta.coverColorB
              })}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,6,11,0.08),rgba(8,4,10,0.34))]" />

            <div className="absolute right-3 top-3 z-10">
              <div className="relative">
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-[14px] border border-white/10 bg-[rgba(24,19,24,0.72)] text-white/80 shadow-sm backdrop-blur hover:border-brand-cyan/40 hover:text-brand-primary"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleMenu();
                  }}
                  aria-label="Действия проекта"
                >
                  <HudMenuGlyph className="h-4 w-4" />
                </button>
                {menuOpen && menuContent}
              </div>
            </div>

            <button
              type="button"
              className="absolute bottom-3 right-3 z-[1] grid h-12 w-12 place-items-center rounded-[16px] border border-white/8 bg-[rgba(58,51,58,0.72)] text-white shadow-lg backdrop-blur transition hover:brightness-110"
              style={accent}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onPlay?.();
              }}
              aria-label="Играть проект"
            >
              {playLoading ? "…" : <PlaybackIcon type="play" className="h-4 w-4" />}
            </button>
          </div>

          <div className="px-1 pb-1 pt-3">
            <p className="truncate font-[var(--font-body)] text-[1.75rem] font-semibold leading-none text-brand-ink">
              {node.title}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-brand-muted">
              <p className="min-w-0 truncate">{secondaryLabel}</p>
              <span className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-brand-cyan/80">{releaseLabel}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
