"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FilePlus2, PencilLine, Radio, Trash2 } from "lucide-react";

import { MultiTrackRecorder, type ReadyPayload } from "@/components/audio/multi-track-recorder";
import { AudioWaveformPlayer } from "@/components/audio/audio-waveform-player";
import { SongAnalysisBadges } from "@/components/songs/song-analysis-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { appendAudioAnalysisToFormData, detectAudioAnalysisMvp } from "@/lib/audio/upload-analysis-client";
import { apiFetch, apiFetchJson, readApiErrorMessage } from "@/lib/client-fetch";
import { getSongStages } from "@/lib/song-stages";
import { pickPreferredPlaybackDemo } from "@/lib/songs-playback-helpers";
import { useSongsPlayback } from "@/components/songs/songs-playback-provider";

type DemoVersionType = "IDEA_TEXT" | "DEMO" | "ARRANGEMENT" | "NO_MIX" | "MIXED" | "MASTERED" | "RELEASE";

type Demo = {
  id: string;
  audioUrl: string | null;
  duration: number;
  textNote?: string | null;
  releaseDate?: string | null;
  versionType: DemoVersionType;
  createdAt: string;
  versionReflection?: {
    whyMade?: string | null;
    whatChanged?: string | null;
    whatNotWorking?: string | null;
  } | null;
};

type TrackDetail = {
  id: string;
  title: string;
  lyricsText?: string | null;
  updatedAt: string;
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
  pathStageId?: number | null;
  pathStage?: { id: number; name: string } | null;
  primaryDemoId?: string | null;
  primaryDemo?: Demo | null;
  demos: Demo[];
};

const stages = getSongStages();

async function getAudioDurationSeconds(file: Blob) {
  return new Promise<number>((resolve) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);
    audio.preload = "metadata";
    audio.src = objectUrl;
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0;
      URL.revokeObjectURL(objectUrl);
      resolve(Math.max(0, duration));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(0);
    };
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function versionLabel(versionType: DemoVersionType) {
  return stages.find((stage) => stage.versionType === versionType)?.name ?? versionType;
}

export default function TrackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const playback = useSongsPlayback();
  const recorderErrorRef = useRef("");
  const [trackTitle, setTrackTitle] = useState("");
  const [lyricsText, setLyricsText] = useState("");
  const [savingTrack, setSavingTrack] = useState(false);

  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [newVersionType, setNewVersionType] = useState<DemoVersionType>("DEMO");
  const [newVersionMode, setNewVersionMode] = useState<"upload" | "record" | "text">("upload");
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [recordedMix, setRecordedMix] = useState<ReadyPayload | null>(null);
  const [newVersionNote, setNewVersionNote] = useState("");
  const [newVersionWhyMade, setNewVersionWhyMade] = useState("");
  const [newVersionWhatChanged, setNewVersionWhatChanged] = useState("");
  const [newVersionWhatNotWorking, setNewVersionWhatNotWorking] = useState("");
  const [newVersionReleaseDate, setNewVersionReleaseDate] = useState("");
  const [creatingVersion, setCreatingVersion] = useState(false);

  const [editingDemoId, setEditingDemoId] = useState<string | null>(null);
  const [editVersionType, setEditVersionType] = useState<DemoVersionType>("DEMO");
  const [editVersionNote, setEditVersionNote] = useState("");
  const [editVersionWhyMade, setEditVersionWhyMade] = useState("");
  const [editVersionWhatChanged, setEditVersionWhatChanged] = useState("");
  const [editVersionWhatNotWorking, setEditVersionWhatNotWorking] = useState("");
  const [editVersionReleaseDate, setEditVersionReleaseDate] = useState("");
  const [savingVersionMeta, setSavingVersionMeta] = useState(false);
  const [deletingDemoId, setDeletingDemoId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  const { data: track, isLoading, refetch } = useQuery({
    queryKey: ["track-detail", id],
    queryFn: () => apiFetchJson<TrackDetail>(`/api/songs/${id}`)
  });

  useEffect(() => {
    if (!track) return;
    setTrackTitle(track.title);
    setLyricsText(track.lyricsText ?? "");
  }, [track]);

  const preferredDemo = useMemo(() => (track ? pickPreferredPlaybackDemo(track) : null), [track]);

  function resetCreateVersionModal() {
    setNewVersionType("DEMO");
    setNewVersionMode("upload");
    setNewVersionFile(null);
    setRecordedMix(null);
    setNewVersionNote("");
    setNewVersionWhyMade("");
    setNewVersionWhatChanged("");
    setNewVersionWhatNotWorking("");
    setNewVersionReleaseDate("");
    recorderErrorRef.current = "";
  }

  async function saveTrackMeta() {
    if (!track) return;
    setSavingTrack(true);
    try {
      const response = await apiFetch(`/api/songs/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trackTitle.trim(),
          lyricsText: lyricsText.trim() || null
        })
      });
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, "Не удалось обновить трек."));
      }
      await refetch();
      toast.success("Трек обновлён.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось обновить трек.");
    } finally {
      setSavingTrack(false);
    }
  }

  async function createVersion() {
    if (!track) return;
    setCreatingVersion(true);
    try {
      if (newVersionType === "IDEA_TEXT" || newVersionMode === "text") {
        const response = await apiFetch(`/api/songs/${track.id}/demos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            versionType: "IDEA_TEXT",
            noteText: newVersionNote,
            reflection: {
              whyMade: newVersionWhyMade,
              whatChanged: newVersionWhatChanged,
              whatNotWorking: newVersionWhatNotWorking
            }
          })
        });
        if (!response.ok) {
          throw new Error(await readApiErrorMessage(response, "Не удалось создать текстовую версию."));
        }
      } else {
        let fileToUpload: Blob | null = null;
        let filename = `demo-${Date.now()}.wav`;
        let durationSec = 0;

        if (newVersionMode === "upload") {
          if (!newVersionFile) throw new Error("Выбери аудиофайл.");
          fileToUpload = newVersionFile;
          filename = newVersionFile.name;
          durationSec = await getAudioDurationSeconds(newVersionFile);
        }

        if (newVersionMode === "record") {
          if (!recordedMix) throw new Error(recorderErrorRef.current || "Сначала собери mix в рекордере.");
          fileToUpload = recordedMix.blob;
          filename = recordedMix.filename;
          durationSec = recordedMix.durationSec;
        }

        if (!fileToUpload) {
          throw new Error("Не удалось подготовить аудио.");
        }

        const analysis = await detectAudioAnalysisMvp(fileToUpload);
        const formData = new FormData();
        formData.append("trackId", track.id);
        formData.append("file", fileToUpload, filename);
        formData.append("durationSec", String(durationSec));
        formData.append("versionType", newVersionType);
        formData.append("noteText", newVersionNote);
        formData.append("reflectionWhyMade", newVersionWhyMade);
        formData.append("reflectionWhatChanged", newVersionWhatChanged);
        formData.append("reflectionWhatNotWorking", newVersionWhatNotWorking);
        if (newVersionType === "RELEASE" && newVersionReleaseDate.trim()) {
          formData.append("releaseDate", newVersionReleaseDate.trim());
        }
        appendAudioAnalysisToFormData(formData, analysis);

        const response = await apiFetch("/api/audio-clips", { method: "POST", body: formData });
        if (!response.ok) {
          throw new Error(await readApiErrorMessage(response, "Не удалось добавить аудио-версию."));
        }
      }

      await refetch();
      setShowCreateVersion(false);
      resetCreateVersionModal();
      toast.success("Версия добавлена.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось добавить версию.");
    } finally {
      setCreatingVersion(false);
    }
  }

  function openEditDemo(demo: Demo) {
    setEditingDemoId(demo.id);
    setEditVersionType(demo.versionType);
    setEditVersionNote(demo.textNote ?? "");
    setEditVersionWhyMade(demo.versionReflection?.whyMade ?? "");
    setEditVersionWhatChanged(demo.versionReflection?.whatChanged ?? "");
    setEditVersionWhatNotWorking(demo.versionReflection?.whatNotWorking ?? "");
    setEditVersionReleaseDate(demo.releaseDate ?? "");
  }

  async function saveDemoMeta() {
    if (!track || !editingDemoId) return;
    setSavingVersionMeta(true);
    try {
      const response = await apiFetch(`/api/songs/${track.id}/demos/${editingDemoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionType: editVersionType,
          noteText: editVersionNote,
          releaseDate: editVersionType === "RELEASE" ? editVersionReleaseDate : null,
          reflection: {
            whyMade: editVersionWhyMade,
            whatChanged: editVersionWhatChanged,
            whatNotWorking: editVersionWhatNotWorking
          }
        })
      });
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, "Не удалось обновить версию."));
      }
      await refetch();
      setEditingDemoId(null);
      toast.success("Версия обновлена.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось обновить версию.");
    } finally {
      setSavingVersionMeta(false);
    }
  }

  async function setPrimary(demoId: string) {
    if (!track) return;
    setSettingPrimaryId(demoId);
    try {
      const response = await apiFetch(`/api/songs/${track.id}/demos/${demoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setAsPrimary: true })
      });
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, "Не удалось сделать версию основной."));
      }
      await refetch();
      toast.success("Основная версия обновлена.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сделать версию основной.");
    } finally {
      setSettingPrimaryId(null);
    }
  }

  async function deleteDemo(demoId: string) {
    if (!track) return;
    setDeletingDemoId(demoId);
    try {
      const response = await apiFetch(`/api/songs/${track.id}/demos/${demoId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, "Не удалось удалить версию."));
      }
      await refetch();
      toast.success("Версия удалена.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось удалить версию.");
    } finally {
      setDeletingDemoId(null);
    }
  }

  function playPreferredVersion() {
    if (!track || !preferredDemo) return;
    playback.playQueue(
      [
        {
          demoId: preferredDemo.id,
          src: preferredDemo.audioUrl || `/api/audio-clips/${preferredDemo.id}/stream`,
          title: track.title,
          subtitle: track.project?.title ?? "Без проекта",
          linkHref: `/songs/${track.id}`,
          durationSec: preferredDemo.duration,
          trackId: track.id,
          projectId: track.project?.id ?? null,
          versionType: preferredDemo.versionType,
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

  if (isLoading || !track) {
    return <p className="text-sm text-brand-muted">Загружаем трек...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={track.project?.id ? `/songs/projects/${track.project.id}` : "/songs"}>
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
        </Link>
        <Badge>{track.pathStage?.name ?? "Без стадии"}</Badge>
      </div>

      <section className="cyber-panel rounded-[30px] px-5 py-6 md:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.16em] text-brand-cyan">Track Detail</p>
            <h1 className="mt-2 font-[var(--font-display)] text-3xl uppercase tracking-[0.14em] text-brand-ink">
              {track.title}
            </h1>
            <p className="mt-2 text-sm text-brand-muted">
              {track.project?.title ? `Проект: ${track.project.title}` : "Трек без проекта"} • Обновлено {formatDate(track.updatedAt)}
            </p>
            <SongAnalysisBadges
              className="mt-4"
              bpm={track.displayBpm}
              keyRoot={track.displayKeyRoot}
              keyMode={track.displayKeyMode}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setShowCreateVersion(true)}>
              <FilePlus2 className="h-4 w-4" />
              Добавить версию
            </Button>
            <Button variant="secondary" onClick={playPreferredVersion} disabled={!preferredDemo}>
              Play primary
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="cyber-panel rounded-[28px] bg-[rgba(14,22,40,0.94)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-brand-cyan">Metadata</p>
              <h2 className="mt-1 font-[var(--font-display)] text-xl uppercase tracking-[0.12em] text-brand-ink">
                Трек
              </h2>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <Input value={trackTitle} onChange={(event) => setTrackTitle(event.target.value)} placeholder="Название трека" />
            <Textarea
              value={lyricsText}
              onChange={(event) => setLyricsText(event.target.value)}
              placeholder="Текст, заметки, структура"
              rows={10}
            />
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void saveTrackMeta()} disabled={savingTrack}>
                {savingTrack ? "Сохраняем..." : "Сохранить метаданные"}
              </Button>
              {track.project?.id ? (
                <Link href={`/songs/projects/${track.project.id}`}>
                  <Button variant="secondary">Открыть проект</Button>
                </Link>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="cyber-panel rounded-[28px] bg-[rgba(14,22,40,0.94)]">
          <p className="text-xs uppercase tracking-[0.16em] text-brand-magenta">Primary Version</p>
          <h2 className="mt-1 font-[var(--font-display)] text-xl uppercase tracking-[0.12em] text-brand-ink">
            Текущий master
          </h2>
          {track.primaryDemo ? (
            <div className="mt-4 space-y-3">
              <Badge>{versionLabel(track.primaryDemo.versionType)}</Badge>
              {track.primaryDemo.audioUrl ? <AudioWaveformPlayer src={track.primaryDemo.audioUrl} /> : null}
              <p className="text-sm text-brand-muted">
                Создано {formatDate(track.primaryDemo.createdAt)}
                {track.primaryDemo.releaseDate ? ` • релиз ${track.primaryDemo.releaseDate}` : ""}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-brand-muted">Основная аудио-версия ещё не выбрана.</p>
          )}
        </Card>
      </div>

      <Card className="cyber-panel rounded-[28px] bg-[rgba(14,22,40,0.94)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-brand-cyan">Versions</p>
            <h2 className="mt-1 font-[var(--font-display)] text-xl uppercase tracking-[0.12em] text-brand-ink">
              История версий
            </h2>
          </div>
          <Badge>{track.demos.length} всего</Badge>
        </div>

        <div className="mt-4 space-y-4">
          {track.demos.length ? (
            track.demos.map((demo) => {
              const isPrimary = track.primaryDemoId === demo.id;
              return (
                <div
                  key={demo.id}
                  className="rounded-[24px] border border-brand-border bg-[rgba(10,18,34,0.84)] p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{versionLabel(demo.versionType)}</Badge>
                        {isPrimary ? <Badge className="bg-[rgba(248,239,0,0.16)] text-brand-primary">Primary</Badge> : null}
                        {demo.releaseDate ? (
                          <Badge className="bg-[rgba(255,79,216,0.12)] text-brand-magenta">
                            <Radio className="mr-1 h-3 w-3" />
                            {demo.releaseDate}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm text-brand-muted">{formatDate(demo.createdAt)}</p>
                      {demo.audioUrl ? <div className="mt-4"><AudioWaveformPlayer src={demo.audioUrl} /></div> : null}
                      {demo.textNote ? <p className="mt-3 text-sm text-brand-ink">{demo.textNote}</p> : null}
                      {demo.versionReflection?.whyMade ? (
                        <p className="mt-3 text-sm text-brand-muted">
                          <span className="text-brand-cyan">Почему:</span> {demo.versionReflection.whyMade}
                        </p>
                      ) : null}
                      {demo.versionReflection?.whatChanged ? (
                        <p className="mt-2 text-sm text-brand-muted">
                          <span className="text-brand-cyan">Что изменили:</span> {demo.versionReflection.whatChanged}
                        </p>
                      ) : null}
                      {demo.versionReflection?.whatNotWorking ? (
                        <p className="mt-2 text-sm text-brand-muted">
                          <span className="text-brand-magenta">Что не работает:</span> {demo.versionReflection.whatNotWorking}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!isPrimary && demo.audioUrl ? (
                        <Button
                          variant="secondary"
                          disabled={settingPrimaryId === demo.id}
                          onClick={() => void setPrimary(demo.id)}
                        >
                          {settingPrimaryId === demo.id ? "..." : "Make primary"}
                        </Button>
                      ) : null}
                      <Button variant="secondary" onClick={() => openEditDemo(demo)}>
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={deletingDemoId === demo.id}
                        onClick={() => void deleteDemo(demo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingDemoId === demo.id ? "..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-brand-muted">Пока нет сохранённых версий.</p>
          )}
        </div>
      </Card>

      <Modal
        open={showCreateVersion}
        onClose={() => {
          setShowCreateVersion(false);
          resetCreateVersionModal();
        }}
        title="Новая версия"
        widthClassName="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={newVersionType} onChange={(event) => setNewVersionType(event.target.value as DemoVersionType)}>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.versionType}>
                  {stage.name}
                </option>
              ))}
            </Select>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={newVersionMode === "upload" ? "primary" : "secondary"} onClick={() => setNewVersionMode("upload")}>
                Upload
              </Button>
              <Button type="button" variant={newVersionMode === "record" ? "primary" : "secondary"} onClick={() => setNewVersionMode("record")}>
                Record
              </Button>
              <Button type="button" variant={newVersionMode === "text" ? "primary" : "secondary"} onClick={() => {
                setNewVersionMode("text");
                setNewVersionType("IDEA_TEXT");
              }}>
                Text only
              </Button>
            </div>
          </div>

          {newVersionMode === "upload" ? (
            <Input type="file" accept="audio/*" onChange={(event) => setNewVersionFile(event.target.files?.[0] ?? null)} />
          ) : null}

          {newVersionMode === "record" ? (
            <MultiTrackRecorder
              onReady={(payload) => {
                setRecordedMix(payload);
                recorderErrorRef.current = "";
              }}
              onError={(message) => {
                recorderErrorRef.current = message;
              }}
            />
          ) : null}

          <Textarea value={newVersionNote} onChange={(event) => setNewVersionNote(event.target.value)} placeholder="Заметка к версии" rows={3} />
          <Textarea value={newVersionWhyMade} onChange={(event) => setNewVersionWhyMade(event.target.value)} placeholder="Почему сделали эту версию" rows={2} />
          <Textarea value={newVersionWhatChanged} onChange={(event) => setNewVersionWhatChanged(event.target.value)} placeholder="Что изменили" rows={2} />
          <Textarea value={newVersionWhatNotWorking} onChange={(event) => setNewVersionWhatNotWorking(event.target.value)} placeholder="Что ещё не работает" rows={2} />
          {newVersionType === "RELEASE" ? (
            <Input type="date" value={newVersionReleaseDate} onChange={(event) => setNewVersionReleaseDate(event.target.value)} />
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreateVersion(false)}>
              Отмена
            </Button>
            <Button onClick={() => void createVersion()} disabled={creatingVersion}>
              {creatingVersion ? "Сохраняем..." : "Сохранить версию"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(editingDemoId)}
        onClose={() => setEditingDemoId(null)}
        title="Редактировать версию"
      >
        <div className="space-y-4">
          <Select value={editVersionType} onChange={(event) => setEditVersionType(event.target.value as DemoVersionType)}>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.versionType}>
                {stage.name}
              </option>
            ))}
          </Select>
          <Textarea value={editVersionNote} onChange={(event) => setEditVersionNote(event.target.value)} placeholder="Заметка" rows={3} />
          <Textarea value={editVersionWhyMade} onChange={(event) => setEditVersionWhyMade(event.target.value)} placeholder="Почему сделали" rows={2} />
          <Textarea value={editVersionWhatChanged} onChange={(event) => setEditVersionWhatChanged(event.target.value)} placeholder="Что изменили" rows={2} />
          <Textarea value={editVersionWhatNotWorking} onChange={(event) => setEditVersionWhatNotWorking(event.target.value)} placeholder="Что не работает" rows={2} />
          {editVersionType === "RELEASE" ? (
            <Input type="date" value={editVersionReleaseDate} onChange={(event) => setEditVersionReleaseDate(event.target.value)} />
          ) : null}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditingDemoId(null)}>
              Отмена
            </Button>
            <Button onClick={() => void saveDemoMeta()} disabled={savingVersionMeta}>
              {savingVersionMeta ? "Сохраняем..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
