import type { DemoVersionType } from "@prisma/client";

import { getSongStageById, getSongStageByVersionType, getSongStages } from "@/lib/song-stages";

export type SongStageLike = {
  id: number;
  name: string;
};

export { getSongStages };

export function normalizeSongStageName(name: string) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

export function isPromoSongStage() {
  return false;
}

export function isIdeaSongStage(name: string) {
  return normalizeSongStageName(name) === normalizeSongStageName(getSongStageByVersionType("IDEA_TEXT")?.name ?? "");
}

export function isDemoSongStage(name: string) {
  return normalizeSongStageName(name) === normalizeSongStageName(getSongStageByVersionType("DEMO")?.name ?? "");
}

export function isReleaseSongStage(name: string) {
  return normalizeSongStageName(name) === normalizeSongStageName(getSongStageByVersionType("RELEASE")?.name ?? "");
}

export function isSelectableSongCreationStage(stage: SongStageLike) {
  return stage.id !== 1;
}

export function findIdeaStage(stages: SongStageLike[] | undefined) {
  return (stages ?? []).find((stage) => stage.id === 1) ?? null;
}

export function findDemoStage(stages: SongStageLike[] | undefined) {
  return (stages ?? []).find((stage) => stage.id === 2) ?? null;
}

export function resolveVersionTypeByStage(stage: SongStageLike): DemoVersionType | null {
  return getSongStageById(stage.id)?.versionType ?? null;
}
