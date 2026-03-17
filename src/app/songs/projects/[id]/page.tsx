"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpDown, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SongAnalysisBadges } from "@/components/songs/song-analysis-badges";
import { apiFetch, apiFetchJson, readApiErrorMessage } from "@/lib/client-fetch";
import { useToast } from "@/components/ui/toast";
import { pickPreferredPlaybackDemo } from "@/lib/songs-playback-helpers";
import { useSongsPlayback } from "@/components/songs/songs-playback-provider";
import { buildProjectCoverStyle } from "@/lib/project-cover-style";

type Demo = {
  id: string;
  audioUrl: string | null;
  duration: number;
  versionType: string;
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
  tracks: Array<{
    id: string;
    title: string;
    sortIndex: number;
    pathStage?: { id: number; name: string } | null;
    primaryDemo?: Demo | null;
    demos: Demo[];
    _count?: { demos?: number };
  }>;
};

function formatProjectBadgeDate() {
  return new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const playback = useSongsPlayback();
  const [reordering, setReordering] = useState(false);

  const { data: project, isLoading, refetch } = useQuery({
    queryKey: ["project-detail", id],
    queryFn: () => apiFetchJson<ProjectDetail>(`/api/projects/${id}`)
  });

  const orderedTracks = useMemo(() => [...(project?.tracks ?? [])].sort((a, b) => a.sortIndex - b.sortIndex), [project?.tracks]);

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
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось переставить треки.");
    } finally {
      setReordering(false);
    }
  }

  function playTrack(track: ProjectDetail["tracks"][number]) {
    const demo = pickPreferredPlaybackDemo(track);
    if (!demo) return;
    playback.playQueue(
      [
        {
          demoId: demo.id,
          src: demo.audioUrl || `/api/audio-clips/${demo.id}/stream`,
          title: track.title,
          subtitle: project?.title ?? "Проект",
          linkHref: `/songs/${track.id}`,
          durationSec: demo.duration,
          trackId: track.id,
          projectId: project?.id,
          versionType: demo.versionType,
          queueGroupType: "track",
          queueGroupId: track.id,
          cover: {
            type: project?.coverType === "IMAGE" ? "image" : "gradient",
            imageUrl: project?.coverImageUrl ?? null,
            colorA: project?.coverColorA ?? null,
            colorB: project?.coverColorB ?? null
          },
          meta: {
            projectTitle: project?.title,
            pathStageName: track.pathStage?.name
          }
        }
      ],
      0,
      { type: "track", trackId: track.id, title: track.title }
    );
  }

  if (isLoading || !project) {
    return <p className="text-sm text-brand-muted">Загружаем проект...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/songs">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Назад в workspace
          </Button>
        </Link>
      </div>

      <section className="cyber-panel rounded-[32px] p-5 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div
            className="aspect-square rounded-[28px] border border-brand-border"
            style={buildProjectCoverStyle({
              releaseKind: project.releaseKind ?? "ALBUM",
              coverType: project.coverType,
              coverImageUrl: project.coverImageUrl,
              coverPresetKey: project.coverPresetKey,
              coverColorA: project.coverColorA,
              coverColorB: project.coverColorB
            })}
          />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{project.releaseKind === "SINGLE" ? "Single" : "Album"}</Badge>
              <Badge className="bg-[rgba(73,246,255,0.12)] text-brand-cyan">{formatProjectBadgeDate()}</Badge>
            </div>
            <h1 className="mt-4 font-[var(--font-display)] text-3xl uppercase tracking-[0.14em] text-brand-ink">
              {project.title}
            </h1>
            <p className="mt-2 text-sm text-brand-muted">
              {project.artistLabel ? `Artist label: ${project.artistLabel}` : "Без artist label"} • {orderedTracks.length} трек.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/songs/record?projectId=${project.id}`}>
                <Button>
                  <Plus className="h-4 w-4" />
                  Добавить трек
                </Button>
              </Link>
              <Link href="/songs/archive">
                <Button variant="secondary">Архив релизов</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Card className="cyber-panel rounded-[28px] bg-[rgba(14,22,40,0.94)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-brand-cyan">Tracklist</p>
            <h2 className="mt-1 font-[var(--font-display)] text-xl uppercase tracking-[0.12em] text-brand-ink">
              Треки проекта
            </h2>
          </div>
          <Badge>{orderedTracks.length}</Badge>
        </div>

        <div className="mt-4 space-y-3">
          {orderedTracks.length ? (
            orderedTracks.map((track, index) => (
              <div
                key={track.id}
                className="flex flex-col gap-4 rounded-[24px] border border-brand-border bg-[rgba(10,18,34,0.84)] p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <Link href={`/songs/${track.id}`} className="text-base font-semibold text-brand-ink hover:text-brand-cyan">
                    {track.title}
                  </Link>
                  <p className="mt-1 text-sm text-brand-muted">
                    {track.pathStage?.name ?? "Без стадии"} • {track._count?.demos ?? track.demos.length} верс.
                  </p>
                  <SongAnalysisBadges
                    className="mt-3"
                    bpm={null}
                    keyRoot={null}
                    keyMode={null}
                    compact
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" disabled={index === 0 || reordering} onClick={() => void moveTrack(track.id, "up")}>
                    <ArrowUpDown className="h-4 w-4" />
                    Up
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={index === orderedTracks.length - 1 || reordering}
                    onClick={() => void moveTrack(track.id, "down")}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    Down
                  </Button>
                  <Button variant="secondary" onClick={() => playTrack(track)} disabled={!pickPreferredPlaybackDemo(track)}>
                    Play
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-brand-muted">В проекте пока нет треков.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
