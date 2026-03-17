"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, FolderTree, Radio, Sparkles, Waves } from "lucide-react";

import { WorkspaceBrowser } from "@/components/songs/workspace-browser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetchJson } from "@/lib/client-fetch";
import { pickPreferredPlaybackDemo } from "@/lib/songs-playback-helpers";
import { useSongsPlayback } from "@/components/songs/songs-playback-provider";
import { SongAnalysisBadges } from "@/components/songs/song-analysis-badges";

type DemoVersionType = "IDEA_TEXT" | "DEMO" | "ARRANGEMENT" | "NO_MIX" | "MIXED" | "MASTERED" | "RELEASE";

type Demo = {
  id: string;
  audioUrl: string | null;
  duration: number;
  versionType: DemoVersionType;
  createdAt: string;
};

type TrackSummary = {
  id: string;
  title: string;
  updatedAt: string;
  pathStage?: { id: number; name: string } | null;
  project?: {
    id: string;
    title: string;
    releaseKind?: "SINGLE" | "ALBUM";
    coverType?: "GRADIENT" | "IMAGE";
    coverImageUrl?: string | null;
    coverPresetKey?: string | null;
    coverColorA?: string | null;
    coverColorB?: string | null;
  } | null;
  displayBpm?: number | null;
  displayKeyRoot?: string | null;
  displayKeyMode?: string | null;
  primaryDemo?: Demo | null;
  demos: Demo[];
  latestDemo?: Demo | null;
  releaseDemo?: Demo | null;
  releaseArchiveMeta?: {
    releaseDate?: string | null;
  } | null;
};

type ProjectSummary = {
  id: string;
  title: string;
};

async function fetcher<T>(url: string): Promise<T> {
  return apiFetchJson<T>(url);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export default function SongsPage() {
  const playback = useSongsPlayback();

  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ["songs-dashboard-tracks"],
    queryFn: () => fetcher<TrackSummary[]>("/api/songs")
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["songs-dashboard-projects"],
    queryFn: () => fetcher<ProjectSummary[]>("/api/projects")
  });

  const recentTracks = useMemo(() => tracks.slice(0, 5), [tracks]);
  const archivedTracks = useMemo(() => tracks.filter((track) => track.releaseArchiveMeta), [tracks]);

  function playTrack(track: TrackSummary) {
    const demo = pickPreferredPlaybackDemo(track);
    if (!demo) return;
    playback.playQueue(
      [
        {
          demoId: demo.id,
          src: demo.audioUrl || `/api/audio-clips/${demo.id}/stream`,
          title: track.title,
          subtitle: track.project?.title ?? "Без проекта",
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
          },
          meta: {
            projectTitle: track.project?.title,
            pathStageName: track.pathStage?.name
          }
        }
      ],
      0,
      { type: "track", trackId: track.id, title: track.title }
    );
  }

  return (
    <div className="space-y-6">
      <section className="cyber-panel app-scanlines rounded-[32px] px-5 py-6 md:px-7 md:py-8">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-3 bg-[rgba(73,246,255,0.12)] text-brand-cyan">Standalone Music Core</Badge>
            <h1 className="font-[var(--font-display)] text-3xl uppercase tracking-[0.16em] text-brand-ink md:text-5xl">
              Cyberaudio Workspace
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted md:text-base">
              Центральная рабочая зона для записи, версий, проектов и релизного архива. Без лишних goal/community
              слоёв, только music core и локальный single-user flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/songs/record">
              <Button>Новая запись</Button>
            </Link>
            <Link href="/songs/archive">
              <Button variant="secondary">Открыть архив</Button>
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <StatCard icon={FolderTree} label="Проекты" value={projects.length} />
          <StatCard icon={Waves} label="Треки" value={tracks.length} />
          <StatCard icon={Radio} label="Релизы" value={archivedTracks.length} />
          <StatCard icon={Activity} label="Активность" value={recentTracks.length} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)]">
        <WorkspaceBrowser
          parentFolderId={null}
          className="cyber-panel rounded-[30px] border border-brand-border bg-[rgba(14,22,40,0.96)]"
        />

        <div className="space-y-6">
          <Card className="cyber-panel rounded-[28px] bg-[rgba(14,22,40,0.94)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-cyan">Recent Tracks</p>
                <h2 className="mt-1 font-[var(--font-display)] text-xl uppercase tracking-[0.12em] text-brand-ink">
                  Последние версии
                </h2>
              </div>
              <Sparkles className="h-5 w-5 text-brand-primary" />
            </div>

            <div className="space-y-3">
              {tracksLoading ? (
                <p className="text-sm text-brand-muted">Загружаем треки...</p>
              ) : recentTracks.length ? (
                recentTracks.map((track) => (
                  <div
                    key={track.id}
                    className="rounded-[22px] border border-brand-border bg-[rgba(10,18,34,0.86)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/songs/${track.id}`} className="text-base font-semibold text-brand-ink hover:text-brand-cyan">
                          {track.title}
                        </Link>
                        <p className="mt-1 text-sm text-brand-muted">
                          {track.pathStage?.name ?? "Без стадии"} {track.project?.title ? `• ${track.project.title}` : ""}
                        </p>
                      </div>
                      <Button variant="secondary" onClick={() => playTrack(track)}>
                        Play
                      </Button>
                    </div>
                    <SongAnalysisBadges
                      className="mt-3"
                      bpm={track.displayBpm}
                      keyRoot={track.displayKeyRoot}
                      keyMode={track.displayKeyMode}
                      compact
                    />
                    <p className="mt-3 text-xs text-brand-muted">
                      Обновлено {formatDate(track.updatedAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-brand-muted">Пока нет треков. Начни с новой записи.</p>
              )}
            </div>
          </Card>

          <Card className="cyber-panel rounded-[28px] bg-[rgba(14,22,40,0.94)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-brand-magenta">Archive Preview</p>
                <h2 className="mt-1 font-[var(--font-display)] text-xl uppercase tracking-[0.12em] text-brand-ink">
                  Релизный архив
                </h2>
              </div>
              <Link href="/songs/archive" className="text-sm text-brand-cyan hover:text-brand-primary">
                Весь архив
              </Link>
            </div>

            <div className="space-y-3">
              {archivedTracks.length ? (
                archivedTracks.slice(0, 4).map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between gap-3 rounded-[22px] border border-brand-border bg-[rgba(10,18,34,0.86)] p-4"
                  >
                    <div className="min-w-0">
                      <Link href={`/songs/${track.id}`} className="block truncate font-medium text-brand-ink hover:text-brand-primary">
                        {track.title}
                      </Link>
                      <p className="mt-1 text-xs text-brand-muted">
                        {track.releaseArchiveMeta?.releaseDate ? `Релиз ${track.releaseArchiveMeta.releaseDate}` : "Release ready"}
                      </p>
                    </div>
                    <Button variant="secondary" onClick={() => playTrack(track)}>
                      Play
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-brand-muted">Релизные версии пока не зафиксированы.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Activity;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[24px] border border-brand-border bg-[rgba(10,18,34,0.82)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-brand-muted">{label}</p>
        <Icon className="h-4 w-4 text-brand-primary" />
      </div>
      <p className="mt-3 font-[var(--font-display)] text-3xl uppercase tracking-[0.1em] text-brand-ink">{value}</p>
    </div>
  );
}
