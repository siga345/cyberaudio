"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { PlaybackIcon } from "@/components/songs/playback-icon";
import { useSongsPlayback } from "@/components/songs/songs-playback-provider";
import { cn } from "@/lib/utils";

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

function buildMiniBars(count: number) {
  return Array.from({ length: count }, (_, idx) => 0.22 + (((idx * 17) % 9) / 9) * 0.62);
}

const progressBars = buildMiniBars(42);

export function SongsMiniPlayerDock() {
  const {
    activeItem,
    playing,
    currentTime,
    duration,
    seek,
    toggle,
    clear,
    openPlayerWindow
  } = useSongsPlayback();

  if (!activeItem) return null;
  const progress = duration > 0 ? currentTime / duration : 0;
  const linkHref = activeItem.linkHref ?? `/songs/${activeItem.trackId}`;

  return (
    <div className={cn("pointer-events-none fixed inset-x-0 bottom-3 z-40 px-3 md:bottom-4")}>
      <div
        className="pointer-events-auto relative mx-auto w-full max-w-[min(32rem,calc(100%-5.5rem))] overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(25,19,24,0.94),rgba(13,10,14,0.98))] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.48)] backdrop-blur-xl"
        onClick={() => openPlayerWindow()}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            clear();
          }}
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.03)] text-brand-muted transition hover:border-white/24 hover:text-brand-cyan"
          aria-label="Закрыть плеер"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 pr-9">
          <button
            type="button"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border border-[rgba(240,220,99,0.85)] bg-[linear-gradient(180deg,#f6e67e,#e5cd47)] text-[#090908] shadow-[0_12px_28px_rgba(0,0,0,0.38)] hover:brightness-105"
            onClick={(event) => {
              event.stopPropagation();
              toggle(activeItem);
            }}
            aria-label={playing ? "Pause" : "Play"}
          >
            <PlaybackIcon type={playing ? "pause" : "play"} className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1">
            <Link
              href={linkHref}
              className="block"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <p className="truncate font-[var(--font-body)] text-xl font-semibold leading-none text-brand-ink">{activeItem.title}</p>
              <p className="mt-1 truncate text-sm text-brand-muted">{activeItem.subtitle}</p>
            </Link>

            <div className="mt-2 flex items-center gap-2">
              <div className="relative h-8 flex-1 overflow-hidden rounded-[14px] border border-white/10 bg-[rgba(255,255,255,0.04)] px-2">
                <div className="flex h-full w-full items-center gap-[2px]">
                  {progressBars.map((height, idx) => {
                    const ratio = progressBars.length <= 1 ? 0 : idx / (progressBars.length - 1);
                    const filled = ratio <= progress;
                    return (
                      <span
                        key={`${idx}-${height}`}
                        className="block min-w-0 flex-1 rounded-full"
                        style={{
                          height: `${Math.max(14, Math.round(24 * height))}px`,
                          backgroundColor: filled ? "#f0dc63" : "rgba(255,255,255,0.18)"
                        }}
                      />
                    );
                  })}
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration, 0.01)}
                  step={0.01}
                  value={Math.min(currentTime, duration || 0)}
                  onInput={(event) => seek(Number((event.target as HTMLInputElement).value))}
                  onChange={(event) => seek(Number(event.target.value))}
                  onPointerDown={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  className="absolute inset-y-0 left-2 right-2 h-full cursor-pointer opacity-0"
                  aria-label="Seek playback"
                />
              </div>
              <span className="w-20 text-right text-sm text-brand-muted">
                {formatClock(currentTime)} / {formatClock(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
