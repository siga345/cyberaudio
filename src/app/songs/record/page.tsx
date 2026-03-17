"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { MultiTrackRecorder, type ReadyPayload } from "@/components/audio/multi-track-recorder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { appendAudioAnalysisToFormData, detectAudioAnalysisMvp } from "@/lib/audio/upload-analysis-client";
import { apiFetch, apiFetchJson, readApiErrorMessage } from "@/lib/client-fetch";
import { getSongStages } from "@/lib/song-stages";

type ProjectOption = {
  id: string;
  title: string;
  releaseKind?: "SINGLE" | "ALBUM";
  folder?: { id: string; title: string } | null;
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
  const presetProjectId = searchParams.get("projectId") ?? "";
  const recorderErrorRef = useRef("");

  const [title, setTitle] = useState("");
  const [lyricsText, setLyricsText] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("2");
  const [captureMode, setCaptureMode] = useState<"upload" | "record" | "text">("upload");
  const [projectMode, setProjectMode] = useState<"existing" | "new">("existing");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectReleaseKind, setNewProjectReleaseKind] = useState<"SINGLE" | "ALBUM">("ALBUM");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recordedMix, setRecordedMix] = useState<ReadyPayload | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["record-projects"],
    queryFn: () => apiFetchJson<ProjectOption[]>("/api/projects")
  });

  useEffect(() => {
    if (presetProjectId) {
      setProjectMode("existing");
      setSelectedProjectId(presetProjectId);
    }
  }, [presetProjectId]);

  const selectedStage = useMemo(
    () => stages.find((stage) => String(stage.id) === selectedStageId) ?? stages[1],
    [selectedStageId]
  );

  async function resolveProjectId() {
    if (projectMode === "existing" && selectedProjectId) {
      return selectedProjectId;
    }
    if (projectMode === "new") {
      const response = await apiFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newProjectTitle.trim() || title.trim(),
          releaseKind: newProjectReleaseKind
        })
      });
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, "Не удалось создать проект."));
      }
      const project = (await response.json()) as { id: string };
      return project.id;
    }
    return null;
  }

  async function submit() {
    setSaving(true);
    try {
      if (!title.trim()) {
        throw new Error("Укажи название трека.");
      }
      if (projectMode === "new" && !newProjectTitle.trim() && !title.trim()) {
        throw new Error("Укажи название проекта.");
      }

      const projectId = await resolveProjectId();
      const trackResponse = await apiFetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          lyricsText: lyricsText.trim() || null,
          projectId,
          pathStageId: captureMode === "text" ? 1 : selectedStage.id
        })
      });
      if (!trackResponse.ok) {
        throw new Error(await readApiErrorMessage(trackResponse, "Не удалось создать трек."));
      }
      const createdTrack = (await trackResponse.json()) as { id: string };

      if (captureMode === "text") {
        const response = await apiFetch(`/api/songs/${createdTrack.id}/demos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            versionType: "IDEA_TEXT",
            noteText: lyricsText.trim() || null
          })
        });
        if (!response.ok) {
          throw new Error(await readApiErrorMessage(response, "Не удалось сохранить текстовую версию."));
        }
      } else {
        let fileToUpload: Blob | null = null;
        let filename = `demo-${Date.now()}.wav`;
        let durationSec = 0;

        if (captureMode === "upload") {
          if (!audioFile) throw new Error("Выбери аудиофайл.");
          fileToUpload = audioFile;
          filename = audioFile.name;
          durationSec = await getAudioDurationSeconds(audioFile);
        }

        if (captureMode === "record") {
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
        formData.append("trackId", createdTrack.id);
        formData.append("file", fileToUpload, filename);
        formData.append("durationSec", String(durationSec));
        formData.append("versionType", selectedStage.versionType);
        formData.append("noteText", "");
        appendAudioAnalysisToFormData(formData, analysis);

        const response = await apiFetch("/api/audio-clips", { method: "POST", body: formData });
        if (!response.ok) {
          throw new Error(await readApiErrorMessage(response, "Не удалось загрузить аудио."));
        }
      }

      toast.success("Трек создан.");
      router.push(`/songs/${createdTrack.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить трек.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="cyber-panel rounded-[32px] px-5 py-6 md:px-6">
        <Badge className="bg-[rgba(248,239,0,0.12)] text-brand-primary">Record Studio</Badge>
        <h1 className="mt-3 font-[var(--font-display)] text-3xl uppercase tracking-[0.14em] text-brand-ink">
          Новая запись
        </h1>
        <p className="mt-2 text-sm text-brand-muted">
          Создай новый трек, выбери проект, зафиксируй стадию и сразу добавь первую версию через upload, recorder или text-only.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
        <Card className="cyber-panel rounded-[28px] bg-[rgba(14,22,40,0.94)]">
          <div className="space-y-4">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Название трека" />
            <Textarea
              value={lyricsText}
              onChange={(event) => setLyricsText(event.target.value)}
              placeholder="Текст, наброски, структура"
              rows={8}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Select value={projectMode} onChange={(event) => setProjectMode(event.target.value as "existing" | "new")}>
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
              ) : (
                <Input value={newProjectTitle} onChange={(event) => setNewProjectTitle(event.target.value)} placeholder="Название проекта" />
              )}
            </div>

            {projectMode === "new" ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant={newProjectReleaseKind === "SINGLE" ? "primary" : "secondary"} onClick={() => setNewProjectReleaseKind("SINGLE")}>
                  Single
                </Button>
                <Button type="button" variant={newProjectReleaseKind === "ALBUM" ? "primary" : "secondary"} onClick={() => setNewProjectReleaseKind("ALBUM")}>
                  Album
                </Button>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <Select value={selectedStageId} onChange={(event) => setSelectedStageId(event.target.value)} disabled={captureMode === "text"}>
                {stages.filter((stage) => stage.id !== 1).map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </Select>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant={captureMode === "upload" ? "primary" : "secondary"} onClick={() => setCaptureMode("upload")}>
                  Upload
                </Button>
                <Button type="button" variant={captureMode === "record" ? "primary" : "secondary"} onClick={() => setCaptureMode("record")}>
                  Record
                </Button>
                <Button type="button" variant={captureMode === "text" ? "primary" : "secondary"} onClick={() => setCaptureMode("text")}>
                  Text
                </Button>
              </div>
            </div>

            {captureMode === "upload" ? (
              <Input type="file" accept="audio/*" onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)} />
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void submit()} disabled={saving}>
                {saving ? "Сохраняем..." : "Создать трек"}
              </Button>
              <Button variant="secondary" onClick={() => router.push("/songs")}>
                Назад в workspace
              </Button>
            </div>
          </div>
        </Card>

        <Card className="cyber-panel rounded-[28px] bg-[rgba(14,22,40,0.94)]">
          <p className="text-xs uppercase tracking-[0.16em] text-brand-cyan">Capture</p>
          <h2 className="mt-1 font-[var(--font-display)] text-xl uppercase tracking-[0.12em] text-brand-ink">
            Первый take
          </h2>
          <p className="mt-2 text-sm text-brand-muted">
            Режим `{captureMode}` {captureMode === "text" ? "создаст idea-only версию." : `сохранит стадию "${selectedStage.name}".`}
          </p>

          {captureMode === "record" ? (
            <div className="mt-4">
              <MultiTrackRecorder
                onReady={(payload) => {
                  setRecordedMix(payload);
                  recorderErrorRef.current = "";
                }}
                onError={(message) => {
                  recorderErrorRef.current = message;
                }}
              />
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] border border-brand-border bg-[rgba(10,18,34,0.84)] p-4">
              <p className="text-sm text-brand-muted">
                {captureMode === "upload"
                  ? "Загрузи исходный файл и система сохранит его как первую версию трека."
                  : "Text-only режим сохранит идею и текст без аудиофайла."}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function RecordPageFallback() {
  return (
    <div className="space-y-6">
      <section className="cyber-panel rounded-[32px] px-5 py-6 md:px-6">
        <Badge className="bg-[rgba(248,239,0,0.12)] text-brand-primary">Record Studio</Badge>
        <h1 className="mt-3 font-[var(--font-display)] text-3xl uppercase tracking-[0.14em] text-brand-ink">
          Новая запись
        </h1>
        <p className="mt-2 text-sm text-brand-muted">Подготавливаем студию...</p>
      </section>
    </div>
  );
}
