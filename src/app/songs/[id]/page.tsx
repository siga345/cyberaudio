"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, MoreHorizontal, PencilLine, Play } from "lucide-react";

import {
  buildTrackPlaybackItem,
  buildVersionSummary,
  formatTrackTimestamp,
  useTrackScreen,
  versionLabel
} from "@/components/songs/track-screen-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch, readApiErrorMessage } from "@/lib/client-fetch";
import { getSongStages } from "@/lib/song-stages";
import { useSongsPlayback } from "@/components/songs/songs-playback-provider";
import { buildProjectCoverStyle } from "@/lib/project-cover-style";

const stages = getSongStages();

export default function TrackPage() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const playback = useSongsPlayback();
  const {
    track,
    isLoading,
    error,
    refetch,
    selectedDemoId,
    setSelectedDemoId,
    selectedDemo
  } = useTrackScreen();

  const [editingTrack, setEditingTrack] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftLyrics, setDraftLyrics] = useState("");
  const [savingTrack, setSavingTrack] = useState(false);

  const [editingDemoId, setEditingDemoId] = useState<string | null>(null);
  const [editVersionType, setEditVersionType] = useState<string>("DEMO");
  const [editVersionNote, setEditVersionNote] = useState("");
  const [editVersionWhyMade, setEditVersionWhyMade] = useState("");
  const [editVersionWhatChanged, setEditVersionWhatChanged] = useState("");
  const [editVersionWhatNotWorking, setEditVersionWhatNotWorking] = useState("");
  const [editVersionReleaseDate, setEditVersionReleaseDate] = useState("");
  const [savingVersionMeta, setSavingVersionMeta] = useState(false);
  const [deletingDemoId, setDeletingDemoId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [menuDemoId, setMenuDemoId] = useState<string | null>(null);

  const autoOpenedPlayer = useRef(false);

  useEffect(() => {
    if (!track) return;
    setDraftTitle(track.title);
    setDraftLyrics(track.lyricsText ?? "");
  }, [track]);

  useEffect(() => {
    if (!track || !selectedDemo || searchParams.get("player") !== "1" || autoOpenedPlayer.current) return;
    if (!selectedDemo.audioUrl) return;

    playback.play(buildTrackPlaybackItem(track, selectedDemo));
    playback.openPlayerWindow();
    autoOpenedPlayer.current = true;
  }, [playback, searchParams, selectedDemo, track]);

  const orderedDemos = useMemo(
    () => [...(track?.demos ?? [])].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [track?.demos]
  );

  const noteBlocks = useMemo(
    () =>
      (track?.lyricsText ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [track?.lyricsText]
  );

  async function saveTrack() {
    if (!track) return;
    setSavingTrack(true);
    try {
      const response = await apiFetch(`/api/songs/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draftTitle.trim(),
          lyricsText: draftLyrics.trim() || null
        })
      });
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, "Не удалось обновить трек."));
      }
      await refetch();
      setEditingTrack(false);
      toast.success("Трек обновлён.");
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Не удалось обновить трек.");
    } finally {
      setSavingTrack(false);
    }
  }

  function openEditDemo(demo: NonNullable<typeof track>["demos"][number]) {
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
          releaseDate: editVersionReleaseDate || null,
          reflection: {
            whyMade: editVersionWhyMade,
            whatChanged: editVersionWhatChanged,
            whatNotWorking: editVersionWhatNotWorking
          }
        })
      });
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, "Не удалось сохранить версию."));
      }
      await refetch();
      setEditingDemoId(null);
      toast.success("Версия обновлена.");
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Не удалось сохранить версию.");
    } finally {
      setSavingVersionMeta(false);
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
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Не удалось удалить версию.");
    } finally {
      setDeletingDemoId(null);
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
        throw new Error(await readApiErrorMessage(response, "Не удалось обновить primary."));
      }
      await refetch();
      toast.success("Primary обновлён.");
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Не удалось обновить primary.");
    } finally {
      setSettingPrimaryId(null);
    }
  }

  function playVersion(demoId: string) {
    if (!track) return;
    const demo = track.demos.find((item) => item.id === demoId);
    if (!demo || !demo.audioUrl) return;
    setSelectedDemoId(demo.id);
    playback.play(buildTrackPlaybackItem(track, demo));
    playback.openPlayerWindow();
  }

  return (
    <>
      <section className="space-y-6">
        <header className="flex items-center justify-between gap-3">
          <Link
            href={track?.project?.releaseKind === "ALBUM" && track.project?.id ? `/songs/projects/${track.project.id}` : "/songs"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-brand-border bg-[rgba(18,7,12,0.88)] text-brand-cyan transition hover:border-brand-cyan/60 hover:text-brand-primary"
            aria-label="Назад"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>

          <div className="flex gap-2">
            {track ? (
              <Link
                href={`/songs/record?trackId=${track.id}`}
                className="inline-flex h-11 items-center justify-center rounded-[14px] border border-brand-primary/60 bg-brand-primary/10 px-4 text-sm font-medium text-brand-primary transition hover:bg-brand-primary/14"
              >
                Новая версия
              </Link>
            ) : null}
            <Button variant="secondary" onClick={() => setEditingTrack(true)} disabled={!track}>
              <PencilLine className="h-4 w-4" />
              Изменить
            </Button>
          </div>
        </header>

        {isLoading ? <p className="text-sm text-brand-muted">Загружаем трек...</p> : null}
        {error ? <p className="rounded-[20px] border border-brand-magenta/40 bg-brand-magenta/10 px-4 py-3 text-sm text-brand-magenta">{error}</p> : null}

        {track ? (
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div
                className="aspect-square rounded-[30px] border border-brand-border/70 shadow-[0_26px_70px_rgba(0,0,0,0.5)]"
                style={buildProjectCoverStyle({
                  releaseKind: track.project?.releaseKind ?? "SINGLE",
                  coverType: track.project?.coverType ?? "GRADIENT",
                  coverImageUrl: track.project?.coverImageUrl ?? null,
                  coverColorA: track.project?.coverColorA ?? "#f0dc63",
                  coverColorB: track.project?.coverColorB ?? "#49f6ff"
                })}
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => selectedDemo?.audioUrl && playVersion(selectedDemo.id)}
                  disabled={!selectedDemo?.audioUrl}
                  className="grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white text-[#111] shadow-[0_18px_38px_rgba(0,0,0,0.28)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Play className="ml-0.5 h-6 w-6 fill-current" />
                </button>
                <div className="min-w-0 flex-1 self-center">
                  <h1 className="truncate font-[var(--font-body)] text-[2.35rem] font-semibold leading-none text-brand-ink">
                    {track.title}
                  </h1>
                  <p className="mt-2 text-base text-brand-muted">
                    {track.project?.title ?? "Сингл"} • {orderedDemos.length} версий
                  </p>
                </div>
              </div>

              <div className="rounded-[22px] border border-brand-border/70 bg-[rgba(19,11,17,0.9)] px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">Активная версия</p>
                <p className="mt-2 text-xl font-semibold text-brand-ink">
                  {selectedDemo ? versionLabel(selectedDemo.versionType) : "Нет версии"}
                </p>
                <p className="mt-2 text-sm text-brand-muted">
                  {selectedDemo ? formatTrackTimestamp(selectedDemo.createdAt) : "Сначала создай первую запись"}
                </p>
              </div>

              <div className="rounded-[22px] border border-brand-border/70 bg-[rgba(19,11,17,0.9)] px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted">Заметки</p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-brand-ink">
                  {noteBlocks.length ? (
                    noteBlocks.slice(0, 10).map((line) => <p key={line}>{line}</p>)
                  ) : (
                    <p className="text-brand-muted">Заметки к треку пока не заполнены.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {orderedDemos.length ? (
                orderedDemos.map((demo, index) => {
                  const isPrimary = track.primaryDemoId === demo.id;
                  const isSelected = selectedDemoId === demo.id;
                  const isCurrent = playback.activeItem?.demoId === demo.id;
                  return (
                    <div
                      key={demo.id}
                      className={`relative rounded-[22px] border px-4 py-4 shadow-[0_14px_34px_rgba(0,0,0,0.34)] ${
                        isSelected
                          ? "border-brand-primary/60 bg-brand-primary/10"
                          : "border-brand-border/70 bg-[rgba(19,11,17,0.9)]"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 shrink-0 pt-1 text-sm text-brand-muted">V{orderedDemos.length - index}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setSelectedDemoId(demo.id)}
                                className="block truncate text-left text-[1.15rem] font-semibold leading-tight text-brand-ink hover:text-brand-primary"
                              >
                                {versionLabel(demo.versionType)}
                              </button>
                              <p className="mt-1 text-sm text-brand-muted">{formatTrackTimestamp(demo.createdAt)}</p>
                            </div>

                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={() => setMenuDemoId((prev) => (prev === demo.id ? null : demo.id))}
                                className="grid h-10 w-10 place-items-center rounded-[14px] border border-white/10 bg-[rgba(24,19,24,0.72)] text-white/80 backdrop-blur transition hover:border-brand-cyan/40 hover:text-brand-primary"
                                aria-label="Действия версии"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                              {menuDemoId === demo.id ? (
                                <div className="absolute right-0 top-12 z-10 min-w-[220px] rounded-[18px] border border-brand-border bg-[rgba(12,6,10,0.98)] p-2 shadow-neon">
                                  {demo.audioUrl ? (
                                    <button
                                      type="button"
                                      className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-cyan hover:bg-brand-cyan/10"
                                      onClick={() => playVersion(demo.id)}
                                    >
                                      Играть
                                    </button>
                                  ) : null}
                                  {!isPrimary && demo.audioUrl ? (
                                    <button
                                      type="button"
                                      className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-cyan hover:bg-brand-cyan/10"
                                      onClick={() => void setPrimary(demo.id)}
                                      disabled={settingPrimaryId === demo.id}
                                    >
                                      Сделать primary
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-cyan hover:bg-brand-cyan/10"
                                    onClick={() => openEditDemo(demo)}
                                  >
                                    Изменить
                                  </button>
                                  <div className="my-1 h-px bg-brand-border/40" />
                                  <button
                                    type="button"
                                    className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-magenta hover:bg-brand-magenta/10"
                                    onClick={() => void deleteDemo(demo.id)}
                                    disabled={deletingDemoId === demo.id}
                                  >
                                    Удалить
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em]">
                            {isPrimary ? (
                              <span className="rounded-full border border-brand-primary/50 bg-brand-primary/10 px-3 py-1 text-brand-primary">
                                Primary
                              </span>
                            ) : null}
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-brand-muted">
                              {demo.audioUrl ? "Audio" : "Text"}
                            </span>
                          </div>

                          <p className="mt-3 text-sm leading-6 text-brand-ink/92">{buildVersionSummary(demo)}</p>

                          <div className="mt-4 flex items-center gap-2">
                            {demo.audioUrl ? (
                              <button
                                type="button"
                                onClick={() => playVersion(demo.id)}
                                className="inline-flex h-11 min-w-[7rem] items-center justify-center gap-2 rounded-[14px] border border-brand-primary/60 bg-brand-primary/10 px-4 text-sm font-medium text-brand-primary transition hover:bg-brand-primary/14"
                              >
                                <Play className="h-4 w-4 fill-current" />
                                {isCurrent && playback.playing ? "Играет" : "Играть"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setSelectedDemoId(demo.id)}
                              className="inline-flex h-11 items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 text-sm font-medium text-brand-ink transition hover:border-brand-cyan/40 hover:text-brand-primary"
                            >
                              Выбрать
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[24px] border border-brand-border/70 bg-[rgba(19,11,17,0.9)] px-5 py-6 text-sm text-brand-muted">
                  У трека пока нет версий.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <Modal open={editingTrack} onClose={() => setEditingTrack(false)} title="Изменить трек" widthClassName="max-w-xl">
        <div className="space-y-4">
          <Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Название трека" />
          <Textarea value={draftLyrics} onChange={(event) => setDraftLyrics(event.target.value)} placeholder="Заметки, текст, структура" rows={12} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditingTrack(false)}>
              Отмена
            </Button>
            <Button onClick={() => void saveTrack()} disabled={savingTrack}>
              {savingTrack ? "Сохраняем..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(editingDemoId)} onClose={() => setEditingDemoId(null)} title="Изменить версию">
        <div className="space-y-4">
          <Select value={editVersionType} onChange={(event) => setEditVersionType(event.target.value)}>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.versionType}>
                {stage.name}
              </option>
            ))}
          </Select>
          <Textarea value={editVersionNote} onChange={(event) => setEditVersionNote(event.target.value)} placeholder="Заметка версии" rows={3} />
          <Textarea value={editVersionWhyMade} onChange={(event) => setEditVersionWhyMade(event.target.value)} placeholder="Зачем делалась эта версия" rows={2} />
          <Textarea value={editVersionWhatChanged} onChange={(event) => setEditVersionWhatChanged(event.target.value)} placeholder="Что поменялось" rows={2} />
          <Textarea value={editVersionWhatNotWorking} onChange={(event) => setEditVersionWhatNotWorking(event.target.value)} placeholder="Что ещё не работает" rows={2} />
          {editVersionType === "RELEASE" ? (
            <Input type="date" value={editVersionReleaseDate} onChange={(event) => setEditVersionReleaseDate(event.target.value)} />
          ) : null}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditingDemoId(null)}>
              Отмена
            </Button>
            <Button onClick={() => void saveDemoMeta()} disabled={savingVersionMeta}>
              {savingVersionMeta ? "Сохраняем..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
