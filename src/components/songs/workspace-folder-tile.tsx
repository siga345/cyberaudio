"use client";

import Link from "next/link";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import { HudMenuGlyph } from "@/components/songs/hud-glyphs";
import type { WorkspaceFolderNode, WorkspacePreviewItem } from "@/components/songs/workspace-types";
import { buildProjectCoverStyle } from "@/lib/project-cover-style";

function previewTileStyle(item: WorkspacePreviewItem): CSSProperties {
  if (item.type === "project") {
    return buildProjectCoverStyle({
      releaseKind: item.releaseKind ?? "ALBUM",
      coverType: item.coverType,
      coverImageUrl: item.coverImageUrl,
      coverPresetKey: item.coverPresetKey,
      coverColorA: item.coverColorA ?? "#49f6ff",
      coverColorB: item.coverColorB ?? "#ff4fd8"
    });
  }

  return {
    background: "linear-gradient(145deg, rgba(27,13,21,1), rgba(11,36,43,1))"
  };
}

type WorkspaceFolderTileProps = {
  node: WorkspaceFolderNode;
  menuOpen: boolean;
  onToggleMenu: () => void;
  menuContent?: ReactNode;
  tileProps?: HTMLAttributes<HTMLDivElement>;
  dragState?: "idle" | "dragging" | "drop-target" | "drop-invalid";
};

export function WorkspaceFolderTile({
  node,
  menuOpen,
  onToggleMenu,
  menuContent,
  tileProps,
  dragState = "idle"
}: WorkspaceFolderTileProps) {
  const preview = node.preview.slice(0, 4);
  const previewCells = preview.length
    ? [...preview, ...Array.from({ length: Math.max(0, 4 - preview.length) }, (_, index) => ({ id: `empty-${index}`, type: "folder" as const, title: "" }))]
    : [];
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
      <Link href={`/songs/folders/${node.id}`} className="group block">
        <div className="relative">
          <div className="relative aspect-square overflow-hidden rounded-[24px] border border-brand-border/70 bg-[rgba(11,6,10,0.96)] shadow-[0_20px_55px_rgba(0,0,0,0.45)] transition-shadow group-hover:shadow-[0_26px_70px_rgba(0,0,0,0.65)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(85,247,255,0.12),transparent_45%),radial-gradient(circle_at_100%_100%,rgba(255,62,89,0.14),transparent_50%)]" />
            <div className="grid h-full w-full grid-cols-2 gap-3 p-3">
              {preview.length ? (
                previewCells.map((item) => (
                  <div
                    key={`${item.type}:${item.id}`}
                    className="relative overflow-hidden rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.03)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    style={previewTileStyle(item)}
                  />
                ))
              ) : (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-[18px] border border-white/8 bg-[rgba(255,255,255,0.03)]" />
                ))
              )}
            </div>

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
                  aria-label="Действия папки"
                >
                  <HudMenuGlyph className="h-4 w-4" />
                </button>
                {menuOpen && menuContent}
              </div>
            </div>
          </div>

          <div className="px-1 pb-1 pt-3">
            <p className="truncate font-[var(--font-body)] text-[1.75rem] font-semibold leading-none text-brand-ink">{node.title}</p>
            <p className="mt-2 text-sm text-brand-muted">{node.itemCount} items</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
