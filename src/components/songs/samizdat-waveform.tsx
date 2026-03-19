"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type SamizdatWaveformProps = {
  src: string;
  progress?: number;
  className?: string;
  barCount?: number;
  onSeekRatio?: (ratio: number) => void;
};

function buildPeaks(channelData: Float32Array, barCount: number) {
  const blockSize = Math.max(1, Math.floor(channelData.length / barCount));
  const peaks: number[] = [];

  for (let idx = 0; idx < barCount; idx += 1) {
    const start = idx * blockSize;
    const end = Math.min(channelData.length, start + blockSize);
    let peak = 0;
    for (let sampleIdx = start; sampleIdx < end; sampleIdx += 1) {
      const value = Math.abs(channelData[sampleIdx]);
      if (value > peak) peak = value;
    }
    peaks.push(Math.max(0.03, Math.min(1, peak)));
  }

  return peaks;
}

export function SamizdatWaveform({
  src,
  progress = 0,
  className,
  barCount = 90,
  onSeekRatio
}: SamizdatWaveformProps) {
  const [peaks, setPeaks] = useState<number[]>(Array.from({ length: barCount }, () => 0.08));
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const safeProgress = useMemo(() => Math.min(Math.max(progress, 0), 1), [progress]);

  useEffect(() => {
    let cancelled = false;

    async function decode() {
      try {
        setLoading(true);
        const response = await fetch(src);
        if (!response.ok) throw new Error("Unable to load waveform.");
        const buffer = await response.arrayBuffer();
        const audioContext = new window.AudioContext();
        const decoded = await audioContext.decodeAudioData(buffer.slice(0));
        const nextPeaks = buildPeaks(decoded.getChannelData(0), barCount);
        await audioContext.close();
        if (!cancelled) {
          setPeaks(nextPeaks);
        }
      } catch {
        if (!cancelled) {
          setPeaks(Array.from({ length: barCount }, (_, index) => 0.18 + ((index * 11) % 5) * 0.08));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void decode();
    return () => {
      cancelled = true;
    };
  }, [barCount, src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (!cssWidth || !cssHeight) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(cssWidth * dpr);
    const height = Math.round(cssHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const midY = height / 2;
    const barWidth = width / peaks.length;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(255,255,255,0.02)";
    context.fillRect(0, 0, width, height);

    for (let idx = 0; idx < peaks.length; idx += 1) {
      const ratio = peaks.length <= 1 ? 0 : idx / (peaks.length - 1);
      const x = idx * barWidth;
      const peak = peaks[idx];
      const barHeight = Math.max(height * 0.08, peak * height * 0.88);
      const y = midY - barHeight / 2;
      context.fillStyle = ratio <= safeProgress ? "#f0dc63" : "rgba(255,255,255,0.82)";
      context.fillRect(x, y, Math.max(1, barWidth * 0.76), barHeight);
    }
  }, [peaks, safeProgress]);

  function handleSeek(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!onSeekRatio) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    onSeekRatio(Math.min(Math.max(ratio, 0), 1));
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[22px] border border-white/12 bg-[rgba(255,255,255,0.03)] px-3 py-2",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className={cn("block h-40 w-full", onSeekRatio ? "cursor-pointer" : "")}
        onClick={handleSeek}
      />
      {loading ? <div className="pointer-events-none absolute inset-0 animate-pulse bg-[rgba(255,255,255,0.03)]" /> : null}
    </div>
  );
}
