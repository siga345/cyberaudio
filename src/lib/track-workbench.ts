import { DemoVersionType, Prisma } from "@prisma/client";

import { getSongStageById, getSongStageByVersionType } from "@/lib/song-stages";

const demoReflectionSelect = {
  whyMade: true,
  whatChanged: true,
  whatNotWorking: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.VersionReflectionSelect;

export const demoSummarySelect = {
  id: true,
  audioPath: true,
  textNote: true,
  duration: true,
  releaseDate: true,
  detectedBpm: true,
  detectedKeyRoot: true,
  detectedKeyMode: true,
  versionType: true,
  sortIndex: true,
  createdAt: true,
  updatedAt: true,
  reflection: {
    select: demoReflectionSelect
  }
} satisfies Prisma.DemoSelect;

export const trackListInclude = {
  folder: true,
  project: true,
  demos: {
    select: demoSummarySelect,
    orderBy: [{ createdAt: "desc" }]
  },
  _count: { select: { demos: true } }
} satisfies Prisma.TrackInclude;

export const trackDetailInclude = {
  folder: true,
  project: true,
  demos: {
    select: demoSummarySelect,
    orderBy: [{ sortIndex: "asc" }, { createdAt: "desc" }]
  },
  _count: { select: { demos: true } }
} satisfies Prisma.TrackInclude;

export const projectDetailInclude = {
  folder: true,
  tracks: {
    orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }],
    include: {
      demos: {
        select: demoSummarySelect,
        orderBy: [{ createdAt: "desc" }]
      },
      _count: { select: { demos: true } }
    }
  },
  _count: { select: { tracks: true } }
} satisfies Prisma.ProjectInclude;

type DemoRecord = Prisma.DemoGetPayload<{ select: typeof demoSummarySelect }>;
type TrackListRecord = Prisma.TrackGetPayload<{ include: typeof trackListInclude }>;
type TrackDetailRecord = Prisma.TrackGetPayload<{ include: typeof trackDetailInclude }>;
type ProjectDetailRecord = Prisma.ProjectGetPayload<{ include: typeof projectDetailInclude }>;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toDateOnly(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function serializeProject(
  project:
    | TrackListRecord["project"]
    | TrackDetailRecord["project"]
    | ProjectDetailRecord
    | null
    | undefined
) {
  if (!project) return null;

  return {
    id: project.id,
    title: project.title,
    artistLabel: project.artistLabel ?? null,
    releaseKind: project.releaseKind,
    coverType: project.coverType,
    coverImageUrl: project.coverImageUrl ?? null,
    coverPresetKey: project.coverPresetKey ?? null,
    coverColorA: project.coverColorA ?? null,
    coverColorB: project.coverColorB ?? null
  };
}

function serializeDemo(demo: DemoRecord) {
  return {
    id: demo.id,
    audioUrl: demo.audioPath ? `/api/audio-clips/${demo.id}/stream` : null,
    duration: demo.duration,
    textNote: demo.textNote ?? null,
    releaseDate: toDateOnly(demo.releaseDate),
    detectedBpm: demo.detectedBpm ?? null,
    detectedKeyRoot: demo.detectedKeyRoot ?? null,
    detectedKeyMode: demo.detectedKeyMode ?? null,
    versionType: demo.versionType,
    sortIndex: demo.sortIndex,
    createdAt: demo.createdAt.toISOString(),
    updatedAt: demo.updatedAt.toISOString(),
    versionReflection: demo.reflection
      ? {
          whyMade: demo.reflection.whyMade ?? null,
          whatChanged: demo.reflection.whatChanged ?? null,
          whatNotWorking: demo.reflection.whatNotWorking ?? null,
          createdAt: demo.reflection.createdAt.toISOString(),
          updatedAt: demo.reflection.updatedAt.toISOString()
        }
      : null
  };
}

function resolveReleaseArchiveMeta(track: TrackListRecord | TrackDetailRecord) {
  const releaseDemo = track.demos.find((demo) => demo.versionType === "RELEASE");
  if (!releaseDemo) return null;
  return {
    source: "release_demo" as const,
    title: track.project?.title ?? track.title,
    artistName: track.project?.artistLabel ?? null,
    releaseDate: toDateOnly(releaseDemo.releaseDate),
    releaseKind: track.project?.releaseKind ?? "SINGLE",
    coverType: track.project?.coverType ?? "GRADIENT",
    coverImageUrl: track.project?.coverImageUrl ?? null,
    coverPresetKey: track.project?.coverPresetKey ?? null,
    coverColorA: track.project?.coverColorA ?? null,
    coverColorB: track.project?.coverColorB ?? null,
    isArchivedSingle: track.project?.releaseKind === "SINGLE"
  };
}

function serializeTrackBase(track: TrackListRecord | TrackDetailRecord) {
  const pathStage = getSongStageById(track.pathStageId);
  const serializedDemos = track.demos.map(serializeDemo);
  const primaryDemo = serializedDemos.find((demo) => demo.id === track.primaryDemoId) ?? null;
  const latestDemo = serializedDemos[0] ?? null;

  return {
    id: track.id,
    title: track.title,
    lyricsText: track.lyricsText ?? null,
    updatedAt: track.updatedAt.toISOString(),
    folderId: track.folderId,
    projectId: track.projectId,
    project: serializeProject(track.project),
    displayBpm: track.displayBpm ?? null,
    displayKeyRoot: track.displayKeyRoot ?? null,
    displayKeyMode: track.displayKeyMode ?? null,
    pathStageId: track.pathStageId,
    pathStage: pathStage ? { id: pathStage.id, name: pathStage.name } : null,
    primaryDemoId: track.primaryDemoId,
    primaryDemo,
    latestDemo,
    demos: serializedDemos,
    releaseDemo: serializedDemos.find((demo) => demo.versionType === "RELEASE") ?? null,
    releaseArchiveMeta: resolveReleaseArchiveMeta(track),
    _count: track._count
  };
}

export function serializeTrackListItem(track: TrackListRecord) {
  return serializeTrackBase(track);
}

export function serializeTrackDetail(track: TrackDetailRecord) {
  return serializeTrackBase(track);
}

export function serializeProjectDetail(project: ProjectDetailRecord) {
  return {
    ...serializeProject(project),
    folder: project.folder ? { id: project.folder.id, title: project.folder.title } : null,
    _count: project._count,
    singleTrackId: project.releaseKind === "SINGLE" && project.tracks.length === 1 ? project.tracks[0]?.id ?? null : null,
    tracks: project.tracks.map((track) => {
      const stage = getSongStageById(track.pathStageId);
      return {
        id: track.id,
        title: track.title,
        sortIndex: track.sortIndex,
        pathStageId: track.pathStageId,
        pathStage: stage ? { id: stage.id, name: stage.name } : null,
        demos: track.demos.map(serializeDemo),
        primaryDemo: track.demos.map(serializeDemo).find((demo) => demo.id === track.primaryDemoId) ?? null,
        _count: track._count
      };
    })
  };
}

export function versionTypeLabel(versionType: string) {
  return getSongStageByVersionType(versionType as DemoVersionType)?.name ?? versionType;
}
