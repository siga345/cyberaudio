"use client";

import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
};

export function RecordGlyph({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </svg>
  );
}

export function NotesGlyph({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path d="M12 5L20 18H4L12 5Z" fill="currentColor" />
    </svg>
  );
}

export function PlayGlyph({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path d="M7 4L20 12L7 20V4Z" fill="currentColor" />
    </svg>
  );
}

export function VersionsGlyph({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <circle cx="19" cy="6" r="2.2" fill="currentColor" />
      <circle cx="19" cy="18" r="2.2" fill="currentColor" />
      <rect x="5" y="4" width="9" height="3" rx="1.5" fill="currentColor" />
      <rect x="5" y="10.5" width="12" height="3" rx="1.5" fill="currentColor" />
      <rect x="5" y="17" width="9" height="3" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export function MenuGlyph({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <rect x="3" y="5" width="18" height="2.6" rx="1.3" fill="currentColor" />
      <rect x="3" y="10.7" width="18" height="2.6" rx="1.3" fill="currentColor" />
      <rect x="3" y="16.4" width="18" height="2.6" rx="1.3" fill="currentColor" />
    </svg>
  );
}

export function SoundGlyph({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <rect x="4" y="10" width="3.2" height="4" rx="1.2" fill="currentColor" />
      <rect x="9" y="6" width="3.2" height="12" rx="1.2" fill="currentColor" />
      <rect x="14" y="8" width="3.2" height="8" rx="1.2" fill="currentColor" />
      <rect x="19" y="4" width="2" height="16" rx="1" fill="currentColor" />
    </svg>
  );
}
