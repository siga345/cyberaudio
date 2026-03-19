"use client";

import { forwardRef, useImperativeHandle } from "react";

import { AudioWaveformPlayer } from "@/components/audio/audio-waveform-player";
import { Button } from "@/components/ui/button";
import { useMultiTrackRecorder } from "./use-multi-track-recorder";
import { RecorderTransport } from "./recorder-transport";
import { RecorderLayersPanel } from "./recorder-layers-panel";
import { RecorderFxPanel } from "./recorder-fx-panel";

export type RecorderTrackRole = "beat" | "guitar" | "lead_vocal" | "double" | "back_vocal" | "piano" | "custom";
export type RecorderTrackTemplate = {
  name?: string;
  role?: RecorderTrackRole | null;
};

export type ReadyPayload = {
  blob: Blob;
  durationSec: number;
  filename: string;
};

export type MultiTrackRecorderSessionSnapshot = {
  bpm: number;
  bpmAutoEnabled: boolean;
  songKeyRoot: string | null;
  songKeyMode: "minor" | "major";
  songKeyAutoEnabled: boolean;
  selectedLayerId: string | null;
  recordingState: "idle" | "recording" | "paused";
  recordingSeconds: number;
  layers: Array<{
    id: string;
    kind: "import" | "recording";
    role: RecorderTrackRole | null;
    name: string;
    muted: boolean;
    volume: number;
    pan: number;
    durationSec: number;
  }>;
  hasStemsPreview: boolean;
  hasMixPreview: boolean;
};

export type MultiTrackRecorderHandle = {
  importAudioLayerFromFile: (
    file: File,
    options?: { name?: string; volume?: number; pan?: number; role?: RecorderTrackRole | null; autoDetectTempoKey?: boolean }
  ) => Promise<void>;
};

type MultiTrackRecorderProps = {
  onReady: (payload: ReadyPayload) => void;
  onError: (message: string) => void;
  onReset?: () => void;
  resetKey?: number;
  armedTrackTemplate?: RecorderTrackTemplate | null;
  onSessionSnapshotChange?: (snapshot: MultiTrackRecorderSessionSnapshot) => void;
};

export const MultiTrackRecorder = forwardRef<MultiTrackRecorderHandle, MultiTrackRecorderProps>(function MultiTrackRecorder(
  { onReady, onError, onReset, resetKey = 0, armedTrackTemplate = null, onSessionSnapshotChange },
  ref
) {
  const recorder = useMultiTrackRecorder({
    onReady, onError, onReset, resetKey, armedTrackTemplate, onSessionSnapshotChange,
  });

  useImperativeHandle(ref, () => ({ importAudioLayerFromFile: recorder.importAudioLayerFromFile }), [recorder.importAudioLayerFromFile]);

  const {
    tab, setTab,
    layers, selectedLayerId, setSelectedLayerId,
    selectedRecordedLayer, selectedRecordedLayerFx,
    updateLayer, removeLayer, importAudioLayerFromFile,
    bpm, setBpm, bpmInputValue, setBpmInputValue, commitBpmInput,
    bpmAutoEnabled, setBpmAutoEnabled,
    songKeyRoot, setSongKeyRoot, songKeyMode, setSongKeyMode,
    songKeyAutoEnabled, setSongKeyAutoEnabled,
    autoDetectLoading, autoDetectError, runAutoDetect,
    metronomeEnabled, setMetronomeEnabled, metronomePreviewPlaying, toggleMetronomePreview,
    recordingState, recordingSeconds, recordWaveCanvasRef,
    startRecording, pauseRecording, resumeRecording, stopRecording, deleteCurrentTake,
    canPause, canResume, canStop, canPreviewMetronome,
    showSaveOnStopButton, primaryRecordButtonLabel, canPrimaryRecordButton,
    fxPanelsOpen, toggleFxPanel, updateSelectedLayerFx, applyFxPreset,
    fxPreviewUrl, fxPreviewStatus, fxPreviewError, renderSelectedFxPreview,
    stemsPreviewUrl, stemsPreviewStatus, stemsPreviewError,
    mixPreviewUrl, mixing,
    renderStemsPreview, renderMixdown,
    resetRecorderSession,
  } = recorder;

  return (
    <div className="space-y-4 rounded-[6px] border border-white/12 bg-[rgba(255,255,255,0.03)] p-4">
      {/* Header */}
      <div className="rounded-[6px] border border-white/12 bg-[rgba(255,255,255,0.02)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan/68">Multitrack Recorder</p>
            <h3 className="text-xl font-semibold tracking-tight text-brand-cyan">Demo Session</h3>
            <p className="mt-1 text-sm text-brand-cyan/68">
              Пошаговая запись дорожек, FX, панорама, preview и финальный render под ваш demo flow.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => resetRecorderSession()}>
              Очистить рекордер
            </Button>
          </div>
        </div>

        <RecorderTransport
          bpm={bpm}
          setBpm={setBpm}
          bpmInputValue={bpmInputValue}
          setBpmInputValue={setBpmInputValue}
          commitBpmInput={commitBpmInput}
          bpmAutoEnabled={bpmAutoEnabled}
          setBpmAutoEnabled={setBpmAutoEnabled}
          autoDetectLoading={autoDetectLoading}
          onAutoDetect={(target) => void runAutoDetect(target)}
          songKeyRoot={songKeyRoot}
          setSongKeyRoot={setSongKeyRoot}
          songKeyMode={songKeyMode}
          setSongKeyMode={setSongKeyMode}
          songKeyAutoEnabled={songKeyAutoEnabled}
          setSongKeyAutoEnabled={setSongKeyAutoEnabled}
          metronomeEnabled={metronomeEnabled}
          setMetronomeEnabled={setMetronomeEnabled}
          metronomePreviewPlaying={metronomePreviewPlaying}
          toggleMetronomePreview={toggleMetronomePreview}
          canPreviewMetronome={canPreviewMetronome}
          recordingState={recordingState}
          recordingSeconds={recordingSeconds}
          canPrimaryRecordButton={canPrimaryRecordButton}
          primaryRecordButtonLabel={primaryRecordButtonLabel}
          canPause={canPause}
          canResume={canResume}
          canStop={canStop}
          showSaveOnStopButton={showSaveOnStopButton}
          onRecord={() => { if (recordingState === "idle") void startRecording(); else resumeRecording(); }}
          onPause={pauseRecording}
          onStop={stopRecording}
          onDeleteTake={deleteCurrentTake}
          recordWaveCanvasRef={recordWaveCanvasRef}
          autoDetectError={autoDetectError}
        />
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2 rounded-[6px] border border-white/12 bg-[rgba(255,255,255,0.02)] p-2">
        {([{ id: "tracks", label: "Tracks" }, { id: "fx", label: "FX" }, { id: "mix", label: "Mix" }] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`min-h-[3.25rem] rounded-[6px] border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
              tab === item.id
                ? "border-[rgba(241,222,98,0.48)] bg-[rgba(241,222,98,0.12)] text-brand-primary"
                : "border-white/12 bg-[rgba(255,255,255,0.03)] text-brand-cyan/72 hover:text-brand-cyan"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Tracks tab */}
      {tab === "tracks" && (
        <RecorderLayersPanel
          layers={layers}
          selectedLayerId={selectedLayerId}
          setSelectedLayerId={setSelectedLayerId}
          stemsPreviewUrl={stemsPreviewUrl}
          stemsPreviewStatus={stemsPreviewStatus}
          stemsPreviewError={stemsPreviewError}
          mixing={mixing}
          onPreviewMix={() => void renderStemsPreview()}
          onImportBeat={(file, options) => void importAudioLayerFromFile(file, options)}
          updateLayer={updateLayer}
          removeLayer={removeLayer}
        />
      )}

      {/* FX tab */}
      {tab === "fx" && (
        <RecorderFxPanel
          selectedRecordedLayer={selectedRecordedLayer}
          selectedRecordedLayerFx={selectedRecordedLayerFx}
          fxPanelsOpen={fxPanelsOpen}
          toggleFxPanel={toggleFxPanel}
          updateSelectedLayerFx={updateSelectedLayerFx}
          applyFxPreset={applyFxPreset}
          fxPreviewUrl={fxPreviewUrl}
          fxPreviewStatus={fxPreviewStatus}
          fxPreviewError={fxPreviewError}
          onRenderFxPreview={() => void renderSelectedFxPreview()}
        />
      )}

      {/* Mix tab */}
      {tab === "mix" && (
        <div className="space-y-4 rounded-[6px] border border-white/12 bg-[rgba(255,255,255,0.02)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => void renderStemsPreview()} disabled={stemsPreviewStatus === "processing" || mixing || !layers.length}>
              {stemsPreviewStatus === "processing" ? "Собираем preview..." : "Собрать preview mix"}
            </Button>
            <Button type="button" onClick={() => void renderMixdown()} disabled={mixing || !layers.length}>
              {mixing ? "Rendering..." : "Render Mix"}
            </Button>
            <p className="text-sm text-brand-cyan/68">Финальный `Render Mix` передаст WAV в demo-flow для сохранения.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[6px] border border-white/12 bg-[rgba(255,255,255,0.03)] p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-brand-cyan/68">Preview Mix</p>
              {stemsPreviewUrl ? (
                <AudioWaveformPlayer src={stemsPreviewUrl} />
              ) : (
                <p className="rounded-[6px] border border-dashed border-white/12 bg-[rgba(255,255,255,0.03)] p-3 text-sm text-brand-cyan/68">
                  Нажмите `Собрать preview mix`.
                </p>
              )}
              {stemsPreviewError && <p className="mt-2 text-xs text-brand-primary">{stemsPreviewError}</p>}
            </div>

            <div className="rounded-[6px] border border-white/12 bg-[rgba(255,255,255,0.03)] p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-brand-cyan/68">Final Render</p>
              {mixPreviewUrl ? (
                <AudioWaveformPlayer src={mixPreviewUrl} />
              ) : (
                <p className="rounded-[6px] border border-dashed border-white/12 bg-[rgba(255,255,255,0.03)] p-3 text-sm text-brand-cyan/68">
                  После `Render Mix` здесь появится финальный preview (stereo WAV).
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MultiTrackRecorder.displayName = "MultiTrackRecorder";
