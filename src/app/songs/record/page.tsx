"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";

import { MultiTrackRecorder, type ReadyPayload } from "@/components/audio/multi-track-recorder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { appendAudioAnalysisToFormData, detectAudioAnalysisMvp } from "@/lib/audio/upload-analysis-client";
import { apiFetch, apiFetchJson, readApiErrorMessage } from "@/lib/client-fetch";
import { getSongStages } from "@/lib/song-stages";
import type { TrackScreenTrack } from "@/components/songs/track-screen-context";

type ProjectOption = {
  id: string;
  title: string;
  releaseKind?: "SINGLE" | "ALBUM";
  folder?: { id: string; title: string } | null;
};

const stages = getSongStages().filter((stage) => stage.versionType !== "IDEA_TEXT");

export default function SongsRecordPage() {
  return (
    <Suspense fallback={<RecordPageFallback />}>
      <SongsRecordPageContent />
    </Suspense>
  );
}

function SongsRecordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const projectId = searchParams.get("projectId") ?? "";
  const trackId = searchParams.get("trackId") ?? "";
  const recorderErrorRef = useRef("");

  const [resetKey, setResetKey] = useState(0);
  const [readyPayload, setReadyPayload] = useState<ReadyPayload | null>(null);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [trackTitle, setTrackTitle] = useState("");
  const [projectMode, setProjectMode] = useState<"none" | "existing" | "new">("none");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectReleaseKind, setNewProjectReleaseKind] = useState<"SINGLE" | "ALBUM">("ALBUM");
  const [newVersionType, setNewVersionType] = useState<"DEMO" | "ARRANGEMENT" | "NO_MIX" | "MIXED" | "MASTERED" | "RELEASE">("DEMO");
  const [versionNote, setVersionNote] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [trackNotes, setTrackNotes] = useState("");

  const { data: projects = [] } = useQuery({
    queryKey: ["record-projects"],
    queryFn: () => apiFetchJson<ProjectOption[]>("/api/projects")
  });

  const { data: existingTrack, isLoading: trackLoading } = useQuery({
    queryKey: ["record-track-context", trackId],
    queryFn: () => apiFetchJson<TrackScreenTrack>(`/api/songs/${trackId}`),
    enabled: Boolean(trackId)
  });

  useEffect(() => {
    if (!projectId) return;
    setProjectMode("existing");
    setSelectedProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    if (!existingTrack) return;
    setTrackTitle(existingTrack.title);
    setTrackNotes(existingTrack.lyricsText ?? "");
    setSelectedProjectId(existingTrack.project?.id ?? "");
    setNewVersionType(
      (stages.find((stage) => stage.id === existingTrack.pathStageId)?.versionType as typeof newVersionType | undefined) ?? "DEMO"
    );
  }, [existingTrack]);

  const contextLabel = useMemo(() => {
    if (existingTrack) return `${existingTrack.title} • ${existingTrack.project?.title ?? "Сингл"}`;
    if (projectId) {
      const project = projects.find((item) => item.id === projectId);
      return project ? `Новый трек в ${project.title}` : "Новый трек в проект";
    }
    return "Быстрая запись";
  }, [existingTrack, projectId, projects]);

  const backHref = existingTrack?.project?.releaseKind === "ALBUM" && existingTrack.project?.id
    ? `/songs/projects/${existingTrack.project.id}`
    : existingTrack
      ? `/songs/${existingTrack.id}`
      : projectId
        ? `/songs/projects/${projectId}`
        : "/songs";

  async function resolveProjectId() {
    if (existingTrack?.project?.id) return existingTrack.project.id;
    if (projectId) return projectId;
    if (projectMode === "existing" && selectedProjectId) return selectedProjectId;
    if (projectMode !== "new") return null;

    const response = await apiFetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newProjectTitle.trim() || trackTitle.trim(),
        releaseKind: newProjectReleaseKind
      })
    });
    if (!response.ok) {
      throw new Error(await readApiErrorMessage(response, "Не удалось создать проект."));
    }
    const project = (await response.json()) as { id: string };
    return project.id;
  }

  function resetRecorderSession() {
    setReadyPayload(null);
    setSaveSheetOpen(false);
    setResetKey((value) => value + 1);
  }

  async function saveRecording() {
    if (!readyPayload) return;

    setSaving(true);
    try {
      const targetProjectId = await resolveProjectId();
      const stage = stages.find((item) => item.versionType === newVersionType) ?? stages[0];
      let targetTrackId = existingTrack?.id ?? null;

      if (!targetTrackId) {
        if (!trackTitle.trim()) {
          throw new Error("Укажи название трека.");
        }

        const trackResponse = await apiFetch("/api/songs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trackTitle.trim(),
            lyricsText: trackNotes.trim() || null,
            projectId: targetProjectId,
            pathStageId: stage.id
          })
        });
        if (!trackResponse.ok) {
          throw new Error(await readApiErrorMessage(trackResponse, "Не удалось создать трек."));
        }
        const createdTrack = (await trackResponse.json()) as { id: string };
        targetTrackId = createdTrack.id;
      }

      if (!targetTrackId) {
        throw new Error("Не удалось определить трек для сохранения.");
      }

      const analysis = await detectAudioAnalysisMvp(readyPayload.blob);
      const formData = new FormData();
      formData.append("trackId", targetTrackId);
      formData.append("file", readyPayload.blob, readyPayload.filename);
      formData.append("durationSec", String(readyPayload.durationSec));
      formData.append("versionType", newVersionType);
      formData.append("noteText", versionNote);
      if (newVersionType === "RELEASE" && releaseDate.trim()) {
        formData.append("releaseDate", releaseDate.trim());
      }
      appendAudioAnalysisToFormData(formData, analysis);

      const response = await apiFetch("/api/audio-clips", { method: "POST", body: formData });
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, "Не удалось сохранить запись."));
      }

      toast.success(existingTrack ? "Новая версия сохранена." : "Трек создан.");
      resetRecorderSession();
      router.push(`/songs/${targetTrackId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить запись.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-brand-border bg-[rgba(18,7,12,0.88)] text-brand-cyan transition hover:border-brand-cyan/60 hover:text-brand-primary"
            aria-label="Назад"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">
              {existingTrack ? "Новая версия" : "Новая запись"}
            </p>
            <p className="mt-1 text-sm text-brand-muted">{contextLabel}</p>
          </div>
        </header>

        {trackLoading ? <p className="text-sm text-brand-muted">Подгружаем контекст трека...</p> : null}

        <div className="cyber-panel rounded-[32px] p-5 md:p-6">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="text-center">
              <h1 className="font-[var(--font-body)] text-[2.6rem] font-semibold leading-none text-brand-ink">
                {existingTrack ? "Записать новую версию" : "Новая запись"}
              </h1>
              <p className="mt-3 text-base text-brand-muted">
                Сначала запиши или собери take, затем мы спросим только минимум для сохранения.
              </p>
            </div>

            <MultiTrackRecorder
              resetKey={resetKey}
              onReady={(payload) => {
                setReadyPayload(payload);
                setSaveSheetOpen(true);
                recorderErrorRef.current = "";
              }}
              onError={(message) => {
                recorderErrorRef.current = message;
              }}
              onReset={() => {
                setReadyPayload(null);
                setSaveSheetOpen(false);
              }}
            />

            {recorderErrorRef.current ? (
              <p className="rounded-[18px] border border-brand-magenta/50 bg-brand-magenta/10 px-4 py-3 text-sm text-brand-magenta">
                {recorderErrorRef.current}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <Modal
        open={saveSheetOpen}
        onClose={() => setSaveSheetOpen(false)}
        title={existingTrack ? "Сохранить новую версию" : "Сохранить запись"}
        description="Коротко определи, куда сохранить take и как назвать результат."
        widthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          {existingTrack ? (
            <div className="rounded-[18px] border border-brand-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-brand-muted">
              Версия сохранится в трек <span className="text-brand-ink">{existingTrack.title}</span>.
            </div>
          ) : (
            <>
              <Input value={trackTitle} onChange={(event) => setTrackTitle(event.target.value)} placeholder="Название трека" />
              <Textarea value={trackNotes} onChange={(event) => setTrackNotes(event.target.value)} placeholder="Короткие заметки к треку" rows={4} />

              {!projectId ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Select value={projectMode} onChange={(event) => setProjectMode(event.target.value as "none" | "existing" | "new")}>
                    <option value="none">Авто-сингл</option>
                    <option value="existing">Существующий проект</option>
                    <option value="new">Новый проект</option>
                  </Select>

                  {projectMode === "existing" ? (
                    <Select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                      <option value="">Без проекта</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </Select>
                  ) : projectMode === "new" ? (
                    <Input value={newProjectTitle} onChange={(event) => setNewProjectTitle(event.target.value)} placeholder="Название проекта" />
                  ) : (
                    <div className="rounded-[18px] border border-brand-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-brand-muted">
                      Будет создан single-проект автоматически.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[18px] border border-brand-border bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-brand-muted">
                  Запись сохранится в текущий проект.
                </div>
              )}

              {!projectId && projectMode === "new" ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={newProjectReleaseKind === "SINGLE" ? "primary" : "secondary"} onClick={() => setNewProjectReleaseKind("SINGLE")}>
                    Сингл
                  </Button>
                  <Button type="button" variant={newProjectReleaseKind === "ALBUM" ? "primary" : "secondary"} onClick={() => setNewProjectReleaseKind("ALBUM")}>
                    Альбом
                  </Button>
                </div>
              ) : null}
            </>
          )}

          <Select value={newVersionType} onChange={(event) => setNewVersionType(event.target.value as typeof newVersionType)}>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.versionType}>
                {stage.name}
              </option>
            ))}
          </Select>

          <Textarea value={versionNote} onChange={(event) => setVersionNote(event.target.value)} placeholder="Короткая заметка к версии" rows={3} />

          {newVersionType === "RELEASE" ? (
            <Input type="date" value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)} />
          ) : null}

          <div className="flex justify-between gap-2">
            <Button variant="secondary" onClick={() => router.push(backHref)}>
              Отмена
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={resetRecorderSession}>
                Повторить
              </Button>
              <Button onClick={() => void saveRecording()} disabled={saving || !readyPayload}>
                {saving ? "Сохраняем..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

function RecordPageFallback() {
  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="cyber-panel rounded-[32px] p-5 md:p-6">
        <p className="text-sm text-brand-muted">Подготавливаем recorder...</p>
      </div>
    </section>
  );
}
