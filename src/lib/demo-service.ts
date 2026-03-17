import { DemoVersionType, Prisma } from "@prisma/client";

import { saveAudioFile, deleteAudioFile } from "@/lib/audio-clips";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSongStageByVersionType } from "@/lib/song-stages";

type DemoReflectionInput = {
  whyMade?: string | null;
  whatChanged?: string | null;
  whatNotWorking?: string | null;
};

type DemoAnalysisInput = {
  bpm?: number | null;
  keyRoot?: string | null;
  keyMode?: string | null;
};

type CreateDemoInput = {
  userId: string;
  trackId: string;
  versionType: DemoVersionType;
  durationSec?: number;
  file?: File | null;
  noteText?: string | null;
  releaseDate?: string | null;
  reflection?: DemoReflectionInput | null;
  analysis?: DemoAnalysisInput | null;
  setAsPrimary?: boolean;
};

type UpdateDemoInput = {
  userId: string;
  trackId: string;
  demoId: string;
  versionType?: DemoVersionType;
  noteText?: string | null;
  releaseDate?: string | null;
  reflection?: DemoReflectionInput | null;
  setAsPrimary?: boolean;
};

type DeleteDemoInput = {
  userId: string;
  trackId: string;
  demoId: string;
};

type TrackScope = {
  id: string;
  projectId: string | null;
  lyricsText: string | null;
  primaryDemoId: string | null;
  pathStageId: number | null;
};

type DemoStateRow = {
  id: string;
  audioPath: string | null;
  versionType: DemoVersionType;
  createdAt: Date;
  detectedBpm: number | null;
  detectedKeyRoot: string | null;
  detectedKeyMode: string | null;
};

function trimOrNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseReleaseDate(value: string | null | undefined) {
  const trimmed = trimOrNull(value);
  if (!trimmed) return null;
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw apiError(400, "Некорректная дата релиза.");
  }
  return parsed;
}

function resolveStageId(versionType: DemoVersionType) {
  const stage = getSongStageByVersionType(versionType);
  if (!stage) {
    throw apiError(400, "Неизвестный тип версии.");
  }
  return stage.id;
}

function choosePrimaryDemo(demos: DemoStateRow[], preferredDemoId?: string | null) {
  const playable = demos.filter((demo) => demo.audioPath && demo.versionType !== "IDEA_TEXT");
  if (!playable.length) return null;
  if (preferredDemoId) {
    const preferred = playable.find((demo) => demo.id === preferredDemoId);
    if (preferred) return preferred;
  }
  return playable
    .slice()
    .sort((a, b) => {
      const stageDiff = resolveStageId(b.versionType) - resolveStageId(a.versionType);
      if (stageDiff !== 0) return stageDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })[0];
}

async function touchProject(tx: Prisma.TransactionClient, projectId: string | null) {
  if (!projectId) return;
  await tx.project.update({
    where: { id: projectId },
    data: { updatedAt: new Date() }
  });
}

async function loadTrackScope(userId: string, trackId: string, tx: Prisma.TransactionClient | PrismaClientLike = prisma) {
  const track = await tx.track.findFirst({
    where: { id: trackId, userId },
    select: {
      id: true,
      projectId: true,
      lyricsText: true,
      primaryDemoId: true,
      pathStageId: true
    }
  });

  if (!track) {
    throw apiError(404, "Трек не найден.");
  }

  return track;
}

type PrismaClientLike = Pick<
  typeof prisma,
  "track" | "demo" | "versionReflection" | "project" | "$transaction"
>;

async function syncTrackDerivedState(
  tx: Prisma.TransactionClient,
  track: TrackScope,
  preferredPrimaryDemoId?: string | null
) {
  const demos = await tx.demo.findMany({
    where: { trackId: track.id },
    select: {
      id: true,
      audioPath: true,
      versionType: true,
      createdAt: true,
      detectedBpm: true,
      detectedKeyRoot: true,
      detectedKeyMode: true
    }
  });

  const currentPrimaryId = preferredPrimaryDemoId ?? track.primaryDemoId;
  const nextPrimary = choosePrimaryDemo(demos, currentPrimaryId);
  const highestStageId = demos.length ? Math.max(...demos.map((demo) => resolveStageId(demo.versionType))) : null;
  const fallbackStageId = !demos.length && track.lyricsText?.trim() ? resolveStageId("IDEA_TEXT") : null;

  await tx.track.update({
    where: { id: track.id },
    data: {
      primaryDemoId: nextPrimary?.id ?? null,
      pathStageId: highestStageId ?? fallbackStageId,
      displayBpm: nextPrimary?.detectedBpm ?? null,
      displayKeyRoot: nextPrimary?.detectedKeyRoot ?? null,
      displayKeyMode: nextPrimary?.detectedKeyMode ?? null,
      updatedAt: new Date()
    }
  });

  await touchProject(tx, track.projectId);
}

export async function createDemoForTrack(input: CreateDemoInput) {
  const track = await loadTrackScope(input.userId, input.trackId);
  const releaseDate = parseReleaseDate(input.releaseDate);
  const noteText = trimOrNull(input.noteText);
  const reflection = input.reflection ?? null;
  const wantsAudio = input.versionType !== "IDEA_TEXT";
  const file = input.file ?? null;

  if (wantsAudio && !file) {
    throw apiError(400, "Для этой версии нужен аудиофайл.");
  }

  let savedAudioPath: string | null = null;
  if (file) {
    const savedFile = await saveAudioFile(file);
    savedAudioPath = savedFile.relativePath;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const lastSibling = await tx.demo.findFirst({
        where: { trackId: track.id, versionType: input.versionType },
        select: { sortIndex: true },
        orderBy: { sortIndex: "desc" }
      });

      const created = await tx.demo.create({
        data: {
          trackId: track.id,
          audioPath: savedAudioPath,
          textNote: noteText,
          duration: Math.max(0, Math.round(input.durationSec ?? 0)),
          releaseDate,
          detectedBpm: input.analysis?.bpm ?? null,
          detectedKeyRoot: trimOrNull(input.analysis?.keyRoot),
          detectedKeyMode: trimOrNull(input.analysis?.keyMode),
          versionType: input.versionType,
          sortIndex: (lastSibling?.sortIndex ?? -1) + 1
        }
      });

      const hasReflection =
        Boolean(trimOrNull(reflection?.whyMade)) ||
        Boolean(trimOrNull(reflection?.whatChanged)) ||
        Boolean(trimOrNull(reflection?.whatNotWorking));

      if (hasReflection) {
        await tx.versionReflection.create({
          data: {
            demoId: created.id,
            whyMade: trimOrNull(reflection?.whyMade),
            whatChanged: trimOrNull(reflection?.whatChanged),
            whatNotWorking: trimOrNull(reflection?.whatNotWorking)
          }
        });
      }

      await syncTrackDerivedState(tx, track, input.setAsPrimary === false ? null : created.id);
      return created;
    });
  } catch (error) {
    await deleteAudioFile(savedAudioPath);
    throw error;
  }
}

export async function updateDemoForTrack(input: UpdateDemoInput) {
  const track = await loadTrackScope(input.userId, input.trackId);
  const demo = await prisma.demo.findFirst({
    where: { id: input.demoId, trackId: track.id },
    select: { id: true, audioPath: true, versionType: true }
  });

  if (!demo) {
    throw apiError(404, "Версия не найдена.");
  }

  if (input.setAsPrimary && (!demo.audioPath || demo.versionType === "IDEA_TEXT")) {
    throw apiError(400, "Текстовую версию нельзя сделать основной.");
  }

  const releaseDate = input.releaseDate === undefined ? undefined : parseReleaseDate(input.releaseDate);
  const nextVersionType = input.versionType ?? demo.versionType;
  if (nextVersionType !== "IDEA_TEXT" && !demo.audioPath) {
    throw apiError(400, "Аудио-версия не может быть пустой.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.demo.update({
      where: { id: demo.id },
      data: {
        versionType: input.versionType,
        textNote: input.noteText === undefined ? undefined : trimOrNull(input.noteText),
        releaseDate
      }
    });

    if (input.reflection !== undefined) {
      const hasReflection =
        Boolean(trimOrNull(input.reflection?.whyMade)) ||
        Boolean(trimOrNull(input.reflection?.whatChanged)) ||
        Boolean(trimOrNull(input.reflection?.whatNotWorking));

      if (!hasReflection) {
        await tx.versionReflection.deleteMany({ where: { demoId: demo.id } });
      } else {
        await tx.versionReflection.upsert({
          where: { demoId: demo.id },
          update: {
            whyMade: trimOrNull(input.reflection?.whyMade),
            whatChanged: trimOrNull(input.reflection?.whatChanged),
            whatNotWorking: trimOrNull(input.reflection?.whatNotWorking)
          },
          create: {
            demoId: demo.id,
            whyMade: trimOrNull(input.reflection?.whyMade),
            whatChanged: trimOrNull(input.reflection?.whatChanged),
            whatNotWorking: trimOrNull(input.reflection?.whatNotWorking)
          }
        });
      }
    }

    await syncTrackDerivedState(tx, track, input.setAsPrimary ? demo.id : undefined);
  });
}

export async function deleteDemoForTrack(input: DeleteDemoInput) {
  const track = await loadTrackScope(input.userId, input.trackId);
  const demo = await prisma.demo.findFirst({
    where: { id: input.demoId, trackId: track.id },
    select: { id: true, audioPath: true }
  });

  if (!demo) {
    throw apiError(404, "Версия не найдена.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.versionReflection.deleteMany({ where: { demoId: demo.id } });
    await tx.demo.delete({ where: { id: demo.id } });
    await syncTrackDerivedState(tx, track, track.primaryDemoId === demo.id ? null : undefined);
  });

  await deleteAudioFile(demo.audioPath);
}
