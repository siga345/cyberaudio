"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetchJson } from "@/lib/client-fetch";
import { useSongsPlayback } from "@/components/songs/songs-playback-provider";
import { pickPreferredPlaybackDemo } from "@/lib/songs-playback-helpers";

type Demo = {
  id: string;
  audioUrl: string | null;
  duration: number;
  versionType: string;
};

type TrackSummary = {
  id: string;
  title: string;
  project?: {
    id: string;
    title: string;
    coverType?: "GRADIENT" | "IMAGE";
    coverImageUrl?: string | null;
    coverColorA?: string | null;
    coverColorB?: string | null;
  } | null;
  primaryDemo?: Demo | null;
  demos: Demo[];
  releaseDemo?: Demo | null;
  releaseArchiveMeta?: {
    title: string;
    artistName?: string | null;
    releaseDate?: string | null;
  } | null;
};

export default function SongsArchivePage() {
  const playback = useSongsPlayback();
  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["songs-archive"],
    queryFn: () => apiFetchJson<TrackSummary[]>("/api/songs")
  });

  const archiveTracks = tracks.filter((track) => track.releaseArchiveMeta);

  function playTrack(track: TrackSummary) {
    const demo = track.releaseDemo ?? pickPreferredPlaybackDemo(track);
    if (!demo) return;
    playback.playQueue(
      [
        {
          demoId: demo.id,
          src: demo.audioUrl || `/api/audio-clips/${demo.id}/stream`,
          title: track.releaseArchiveMeta?.title ?? track.title,
          subtitle: track.releaseArchiveMeta?.artistName ?? track.project?.title ?? "Release archive",
          linkHref: `/songs/${track.id}`,
          durationSec: demo.duration,
          trackId: track.id,
          projectId: track.project?.id ?? null,
          versionType: demo.versionType,
          queueGroupType: "track",
          queueGroupId: track.id,
          cover: {
            type: track.project?.coverType === "IMAGE" ? "image" : "gradient",
            imageUrl: track.project?.coverImageUrl ?? null,
            colorA: track.project?.coverColorA ?? null,
            colorB: track.project?.coverColorB ?? null
          }
        }
      ],
      0,
      { type: "track", trackId: track.id, title: track.title }
    );
  }

  return (
    <div className="space-y-6">
      <section className="cyber-panel rounded-[32px] px-5 py-6 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-brand-magenta">Release Archive</p>
            <h1 className="mt-2 font-[var(--font-display)] text-3xl uppercase tracking-[0.14em] text-brand-ink">
              Архив релизов
            </h1>
            <p className="mt-2 text-sm text-brand-muted">
              Все треки, у которых зафиксирована версия типа RELEASE.
            </p>
          </div>
          <Link href="/songs">
            <Button variant="secondary">Вернуться в workspace</Button>
          </Link>
        </div>
      </section>

      <Card className="cyber-panel rounded-[28px] bg-[rgba(14,22,40,0.94)]">
        {isLoading ? (
          <p className="text-sm text-brand-muted">Загружаем архив...</p>
        ) : archiveTracks.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archiveTracks.map((track) => (
              <div key={track.id} className="rounded-[24px] border border-brand-border bg-[rgba(10,18,34,0.84)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge>{track.releaseArchiveMeta?.releaseDate ?? "Release"}</Badge>
                  <Button variant="secondary" onClick={() => playTrack(track)}>
                    Play
                  </Button>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-brand-ink">{track.releaseArchiveMeta?.title ?? track.title}</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  {track.releaseArchiveMeta?.artistName ?? track.project?.title ?? "Без подписи"}
                </p>
                <Link href={`/songs/${track.id}`} className="mt-4 inline-flex text-sm text-brand-cyan hover:text-brand-primary">
                  Открыть трек
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-muted">Архив релизов пока пуст.</p>
        )}
      </Card>
    </div>
  );
}
