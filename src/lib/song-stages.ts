import type { DemoVersionType } from "@prisma/client";

export type CanonicalSongStageLabel = {
  id: number;
  name: string;
  description: string;
  iconKey: string;
  versionType: DemoVersionType;
};

export const SONG_STAGES: CanonicalSongStageLabel[] = [
  {
    id: 1,
    name: "Идея",
    description: "Зафиксируй ядро трека: тема, эмоция и хук.",
    iconKey: "spark",
    versionType: "IDEA_TEXT"
  },
  {
    id: 2,
    name: "Демо",
    description: "Собери первый черновой вайб и основной скелет аранжировки.",
    iconKey: "mic",
    versionType: "DEMO"
  },
  {
    id: 3,
    name: "Аранжировка",
    description: "Разложи структуру, инструменты и драматургию трека.",
    iconKey: "grid",
    versionType: "ARRANGEMENT"
  },
  {
    id: 4,
    name: "Запись без сведения",
    description: "Запиши вокал и ключевые дорожки до чистового микса.",
    iconKey: "record",
    versionType: "NO_MIX"
  },
  {
    id: 5,
    name: "Сведение",
    description: "Собери сбалансированный микс с нужной энергией.",
    iconKey: "sliders",
    versionType: "MIXED"
  },
  {
    id: 6,
    name: "Мастеринг",
    description: "Подготовь финальный мастер для платформ и релизных файлов.",
    iconKey: "wave",
    versionType: "MASTERED"
  },
  {
    id: 7,
    name: "Релиз",
    description: "Зафиксируй релизную версию и отправь трек в архив каталога.",
    iconKey: "rocket",
    versionType: "RELEASE"
  }
];

export const canonicalSongStageByOrder: Record<number, Omit<CanonicalSongStageLabel, "id" | "versionType">> =
  Object.fromEntries(SONG_STAGES.map(({ id, versionType, ...stage }) => [id, stage]));

export function getSongStages() {
  return SONG_STAGES;
}

export function getSongStageById(stageId: number | null | undefined) {
  if (!stageId) return null;
  return SONG_STAGES.find((stage) => stage.id === stageId) ?? null;
}

export function getSongStageByVersionType(versionType: DemoVersionType) {
  return SONG_STAGES.find((stage) => stage.versionType === versionType) ?? null;
}

export function canonicalizeSongStage<T extends { order: number; name: string; description: string; iconKey: string }>(
  stage: T
): T {
  const canonical = canonicalSongStageByOrder[stage.order];
  if (!canonical) return stage;
  return {
    ...stage,
    name: canonical.name,
    description: canonical.description,
    iconKey: canonical.iconKey
  };
}
