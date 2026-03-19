"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetchJson } from "@/lib/client-fetch";
import { getSongStageByVersionType } from "@/lib/song-stages";
import { type SongsPlaybackItem } from "@/components/songs/songs-playback-provider";
import { isPlayableDemo, pickPreferredPlaybackDemo } from "@/lib/songs-playback-helpers";

export type DemoVersionType = "IDEA_TEXT" | "DEMO" | "ARRANGEMENT" | "NO_MIX" | "MIXED" | "MASTERED" | "RELEASE";

export type TrackScreenDemo = {
  id: string;
  audioUrl: string | null;
  duration: number;
  textNote?: string | null;
  releaseDate?: string | null;
  versionType: DemoVersionType;
  createdAt: string;
  updatedAt?: string;
  versionReflection?: {
    whyMade?: string | null;
    whatChanged?: string | null;
    whatNotWorking?: string | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
};

export type TrackScreenTrack = {
  id: string;
  title: string;
  lyricsText?: string | null;
  updatedAt: string;
  displayBpm?: number | null;
  displayKeyRoot?: string | null;
  displayKeyMode?: string | null;
  pathStageId?: number | null;
  pathStage?: { id: number; name: string } | null;
  primaryDemoId?: string | null;
  primaryDemo?: TrackScreenDemo | null;
  latestDemo?: TrackScreenDemo | null;
  project?: {
    id: string;
    title: string;
    artistLabel?: string | null;
    releaseKind?: "SINGLE" | "ALBUM";
    coverType?: "GRADIENT" | "IMAGE";
    coverImageUrl?: string | null;
    coverColorA?: string | null;
    coverColorB?: string | null;
  } | null;
  demos: TrackScreenDemo[];
};

export type TrackMarker = {
  id: string;
  seconds: number;
  label: string;
};

type TrackScreenContextValue = {
  trackId: string;
  track: TrackScreenTrack | null;
  isLoading: boolean;
  error: string;
  refetch: () => Promise<unknown>;
  selectedDemoId: string | null;
  setSelectedDemoId: (demoId: string) => void;
  selectedDemo: TrackScreenDemo | null;
  playableDemos: TrackScreenDemo[];
  sessionMarkers: TrackMarker[];
  addSessionMarker: (seconds: number) => void;
  clearSessionMarkers: () => void;
};

const TrackScreenContext = createContext<TrackScreenContextValue | null>(null);

function getDefaultDemo(track: TrackScreenTrack | null) {
  if (!track) return null;
  return pickPreferredPlaybackDemo(track) ?? track.latestDemo ?? track.demos[0] ?? null;
}

export function versionLabel(versionType: DemoVersionType | string) {
  return getSongStageByVersionType(versionType as DemoVersionType)?.name ?? versionType;
}

export function formatTrackTimestamp(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function buildStructureRows(lyricsText?: string | null) {
  const lines = (lyricsText ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length) {
    return lines.slice(0, 8);
  }

  return ["Intro", "Verse", "Chorus", "Break"];
}

export function buildVersionSummary(demo: TrackScreenDemo) {
  return (
    demo.versionReflection?.whatChanged ||
    demo.versionReflection?.whyMade ||
    demo.textNote ||
    versionLabel(demo.versionType)
  );
}

export function buildTrackPlaybackItem(track: TrackScreenTrack, demo: TrackScreenDemo): SongsPlaybackItem {
  return {
    demoId: demo.id,
    src: demo.audioUrl || `/api/audio-clips/${demo.id}/stream`,
    title: track.title,
    subtitle: `${versionLabel(demo.versionType)}${track.project?.title ? ` / ${track.project.title}` : ""}`,
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
      colorA: track.project?.coverColorA ?? "#f0dc63",
      colorB: track.project?.coverColorB ?? "#f8f4ec"
    },
    meta: {
      projectTitle: track.project?.title,
      pathStageName: track.pathStage?.name
    }
  };
}

export function trackTabHref(trackId: string, tab: "notes" | "record" | "play" | "versions") {
  if (tab === "notes") return `/songs/${trackId}`;
  return `/songs/${trackId}/${tab}`;
}

export function TrackScreenProvider({ trackId, children }: { trackId: string; children: ReactNode }) {
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null);
  const [sessionMarkers, setSessionMarkers] = useState<TrackMarker[]>([]);

  const {
    data: track = null,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["track-screen", trackId],
    queryFn: () => apiFetchJson<TrackScreenTrack>(`/api/songs/${trackId}`)
  });

  const playableDemos = useMemo(() => track?.demos.filter((demo) => isPlayableDemo(demo)) ?? [], [track]);
  const selectedDemo = useMemo(
    () => track?.demos.find((demo) => demo.id === selectedDemoId) ?? getDefaultDemo(track),
    [selectedDemoId, track]
  );

  useEffect(() => {
    setSessionMarkers([]);
  }, [trackId]);

  useEffect(() => {
    const nextDefault = getDefaultDemo(track);
    if (!track) {
      setSelectedDemoId(null);
      return;
    }

    if (selectedDemoId && track.demos.some((demo) => demo.id === selectedDemoId)) {
      return;
    }

    setSelectedDemoId(nextDefault?.id ?? null);
  }, [selectedDemoId, track]);

  function addSessionMarker(seconds: number) {
    const safeSeconds = Math.max(0, Math.round(seconds));
    setSessionMarkers((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        seconds: safeSeconds,
        label: `M${current.length + 1}`
      }
    ]);
  }

  return (
    <TrackScreenContext.Provider
      value={{
        trackId,
        track,
        isLoading,
        error: error instanceof Error ? error.message : "",
        refetch,
        selectedDemoId,
        setSelectedDemoId,
        selectedDemo,
        playableDemos,
        sessionMarkers,
        addSessionMarker,
        clearSessionMarkers: () => setSessionMarkers([])
      }}
    >
      {children}
    </TrackScreenContext.Provider>
  );
}

export function useTrackScreen() {
  const context = useContext(TrackScreenContext);
  if (!context) {
    throw new Error("useTrackScreen must be used within TrackScreenProvider");
  }
  return context;
}
