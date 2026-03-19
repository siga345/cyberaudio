"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, MoreHorizontal, Pause, Play, Plus } from "lucide-react";

import { apiFetch, apiFetchJson, readApiErrorMessage } from "@/lib/client-fetch";
import { buildProjectCoverStyle } from "@/lib/project-cover-style";
import { pickPreferredPlaybackDemo } from "@/lib/songs-playback-helpers";
import { useSongsPlayback } from "@/components/songs/songs-playback-provider";
import { useToast } from "@/components/ui/toast";
import { formatTrackTimestamp } from "@/components/songs/track-screen-context";

type Demo = {
  id: string;
  audioUrl: string | null;
  duration: number;
  versionType: string;
  updatedAt?: string;
};

type ProjectDetail = {
  id: string;
  title: string;
  artistLabel?: string | null;
  releaseKind?: "SINGLE" | "ALBUM";
  coverType: "GRADIENT" | "IMAGE";
  coverImageUrl?: string | null;
  coverPresetKey?: string | null;
  coverColorA?: string | null;
  coverColorB?: string | null;
  updatedAt?: string;
  tracks: Array<{
    id: string;
    title: string;
    sortIndex: number;
    updatedAt: string;
    pathStageId?: number | null;
    pathStage?: { id: number; name: string } | null;
    playableDemoId?: string | null;
    latestDemoUpdatedAt?: string | null;
    primaryDemo?: Demo | null;
    demos: Demo[];
    _count?: { demos?: number };
  }>;
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const playback = useSongsPlayback();
  const [reordering, setReordering] = useState(false);
  const [menuTrackId, setMenuTrackId] = useState<string | null>(null);

  const { data: project, isLoading, refetch } = useQuery({
    queryKey: ["project-detail", id],
    queryFn: () => apiFetchJson<ProjectDetail>(`/api/projects/${id}`)
  });

  const orderedTracks = useMemo(() => [...(project?.tracks ?? [])].sort((a, b) => a.sortIndex - b.sortIndex), [project?.tracks]);
  const hasPlayableTracks = orderedTracks.some((track) => pickPreferredPlaybackDemo(track));
  const isProjectActive = Boolean(project && playback.activeItem?.projectId === project.id);

  async function moveTrack(trackId: string, direction: "up" | "down") {
    if (!project) return;
    const currentIndex = orderedTracks.findIndex((track) => track.id === trackId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedTracks.length) return;

    const nextOrder = orderedTracks.map((track) => track.id);
    [nextOrder[currentIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[currentIndex]];

    setReordering(true);
    try {
      const response = await apiFetch(`/api/projects/${project.id}/tracks/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedTrackIds: nextOrder })
      });
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, "Не удалось переставить треки."));
      }
      setMenuTrackId(null);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось переставить треки.");
    } finally {
      setReordering(false);
    }
  }

  function playTrack(track: ProjectDetail["tracks"][number]) {
    if (!project) return;
    const demo = pickPreferredPlaybackDemo(track);
    if (!demo) return;

    const item = {
      demoId: demo.id,
      src: demo.audioUrl || `/api/audio-clips/${demo.id}/stream`,
      title: track.title,
      subtitle: project.title,
      linkHref: `/songs/${track.id}`,
      durationSec: demo.duration,
      trackId: track.id,
      projectId: project.id,
      versionType: demo.versionType,
      queueGroupType: "track" as const,
      queueGroupId: track.id,
      cover: {
        type: project.coverType === "IMAGE" ? "image" as const : "gradient" as const,
        imageUrl: project.coverImageUrl ?? null,
        colorA: project.coverColorA ?? null,
        colorB: project.coverColorB ?? null
      },
      meta: {
        projectTitle: project.title,
        pathStageName: track.pathStage?.name
      }
    };

    playback.playQueue([item], 0, { type: "track", trackId: track.id, title: track.title });
  }

  function toggleProjectPlayback() {
    if (!project) return;
    if (isProjectActive && playback.activeItem) {
      playback.toggle(playback.activeItem);
      return;
    }

    const queue = orderedTracks
      .map((track) => {
        const demo = pickPreferredPlaybackDemo(track);
        if (!demo) return null;
        return {
          demoId: demo.id,
          src: demo.audioUrl || `/api/audio-clips/${demo.id}/stream`,
          title: track.title,
          subtitle: `${project.title}${track.pathStage?.name ? ` • ${track.pathStage.name}` : ""}`,
          linkHref: `/songs/${track.id}`,
          durationSec: demo.duration,
          trackId: track.id,
          projectId: project.id,
          versionType: demo.versionType,
          queueGroupType: "project" as const,
          queueGroupId: project.id,
          cover: {
            type: project.coverType === "IMAGE" ? "image" as const : "gradient" as const,
            imageUrl: project.coverImageUrl ?? null,
            colorA: project.coverColorA ?? null,
            colorB: project.coverColorB ?? null
          },
          meta: {
            projectTitle: project.title,
            pathStageName: track.pathStage?.name
          }
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (!queue.length) {
      toast.error("В проекте пока нет playable версий.");
      return;
    }

    playback.playQueue(queue, 0, { type: "project", projectId: project.id, title: project.title });
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/songs"
          className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-brand-border bg-[rgba(18,7,12,0.88)] text-brand-cyan transition hover:border-brand-cyan/60 hover:text-brand-primary"
          aria-label="Назад к библиотеке"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href={`/songs/record?projectId=${id}`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border border-brand-primary/60 bg-brand-primary/10 px-4 text-sm font-medium text-brand-primary transition hover:bg-brand-primary/14"
        >
          <Plus className="h-4 w-4" />
          Добавить трек
        </Link>
      </header>

      {isLoading ? <p className="text-sm text-brand-muted">Загружаем проект...</p> : null}

      {project ? (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div
              className="aspect-square rounded-[30px] border border-brand-border/70 shadow-[0_26px_70px_rgba(0,0,0,0.5)]"
              style={buildProjectCoverStyle({
                releaseKind: project.releaseKind ?? "ALBUM",
                coverType: project.coverType,
                coverImageUrl: project.coverImageUrl,
                coverPresetKey: project.coverPresetKey,
                coverColorA: project.coverColorA,
                coverColorB: project.coverColorB
              })}
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={toggleProjectPlayback}
                disabled={!hasPlayableTracks}
                className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white text-[#111] shadow-[0_18px_38px_rgba(0,0,0,0.28)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isProjectActive && playback.playing ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6 fill-current" />}
              </button>
              <div className="min-w-0 flex-1 self-center">
                <h1 className="truncate font-[var(--font-body)] text-[2.4rem] font-semibold leading-none text-brand-ink">
                  {project.title}
                </h1>
                <p className="mt-2 text-base text-brand-muted">
                  {project.artistLabel || "Без артиста"} • {orderedTracks.length} трек{orderedTracks.length === 1 ? "" : orderedTracks.length > 1 && orderedTracks.length < 5 ? "а" : "ов"}
                </p>
              </div>
            </div>

            <Link
              href={`/songs/record?projectId=${project.id}`}
              className="inline-flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-[18px] border border-brand-border bg-[rgba(255,255,255,0.04)] px-4 text-base font-medium text-brand-ink transition hover:border-brand-cyan/40 hover:text-brand-primary"
            >
              <Plus className="h-4 w-4" />
              Добавить трек
            </Link>
          </div>

          <div className="space-y-3">
            {orderedTracks.length ? (
              orderedTracks.map((track, index) => {
                const demo = pickPreferredPlaybackDemo(track);
                const isCurrentTrack = playback.activeItem?.trackId === track.id;
                return (
                  <div
                    key={track.id}
                    className="relative rounded-[22px] border border-brand-border/70 bg-[rgba(19,11,17,0.9)] px-4 py-4 shadow-[0_14px_34px_rgba(0,0,0,0.34)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-6 shrink-0 pt-1 text-sm text-brand-muted">{index + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link href={`/songs/${track.id}`} className="block truncate text-[1.2rem] font-semibold leading-tight text-brand-ink hover:text-brand-primary">
                              {track.title}
                            </Link>
                            <p className="mt-1 text-sm text-brand-muted">
                              {formatTrackTimestamp(track.latestDemoUpdatedAt ?? track.updatedAt)}
                            </p>
                          </div>

                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => setMenuTrackId((prev) => (prev === track.id ? null : track.id))}
                              className="grid h-10 w-10 place-items-center rounded-[14px] border border-white/10 bg-[rgba(24,19,24,0.72)] text-white/80 backdrop-blur transition hover:border-brand-cyan/40 hover:text-brand-primary"
                              aria-label="Действия трека"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {menuTrackId === track.id ? (
                              <div className="absolute right-0 top-12 z-10 min-w-[200px] rounded-[18px] border border-brand-border bg-[rgba(12,6,10,0.98)] p-2 shadow-neon">
                                <Link
                                  href={`/songs/${track.id}`}
                                  className="block rounded-[14px] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-brand-cyan hover:bg-brand-cyan/10"
                                  onClick={() => setMenuTrackId(null)}
                                >
                                  Открыть
                                </Link>
                                <button
                                  type="button"
                                  className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-cyan hover:bg-brand-cyan/10"
                                  onClick={() => void moveTrack(track.id, "up")}
                                  disabled={index === 0 || reordering}
                                >
                                  Вверх
                                </button>
                                <button
                                  type="button"
                                  className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-cyan hover:bg-brand-cyan/10"
                                  onClick={() => void moveTrack(track.id, "down")}
                                  disabled={index === orderedTracks.length - 1 || reordering}
                                >
                                  Вниз
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em]">
                          {track.pathStage?.name ? (
                            <span className="rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-brand-cyan">
                              {track.pathStage.name}
                            </span>
                          ) : null}
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-brand-muted">
                            {track._count?.demos ?? track.demos.length} версий
                          </span>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playTrack(track)}
                            disabled={!demo}
                            className="inline-flex h-11 min-w-[7rem] items-center justify-center gap-2 rounded-[14px] border border-brand-primary/60 bg-brand-primary/10 px-4 text-sm font-medium text-brand-primary transition hover:bg-brand-primary/14 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {isCurrentTrack && playback.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                            {isCurrentTrack && playback.playing ? "Пауза" : "Играть"}
                          </button>
                          <Link
                            href={`/songs/${track.id}`}
                            className="inline-flex h-11 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-brand-ink transition hover:border-brand-cyan/40 hover:text-brand-primary"
                          >
                            Открыть
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-brand-border/70 bg-[rgba(19,11,17,0.9)] px-5 py-6 text-sm text-brand-muted">
                В проекте пока нет треков.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
