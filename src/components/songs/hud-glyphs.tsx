"use client";

import { cn } from "@/lib/utils";

type GlyphProps = {
  className?: string;
};

export function HudFolderGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path d="M2 8.5H9L11.2 6H22V18.5L19.4 21H2V8.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2 11H22" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function HudProjectGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function HudRecordGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <circle cx="12" cy="12" r="7.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </svg>
  );
}

export function HudTrackGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path d="M6 4H19V15.6C19 18 17.2 20 14.8 20C12.8 20 11.3 18.8 11.3 17.1C11.3 15.4 12.8 14.2 14.8 14.2C15.5 14.2 16.1 14.3 16.7 14.6V7.1H9.1V17.1C9.1 19.5 7.3 21.4 4.9 21.4C2.9 21.4 1.4 20.2 1.4 18.5C1.4 16.8 2.9 15.6 4.9 15.6C5.6 15.6 6.2 15.7 6.8 16V4H6Z" fill="currentColor" />
    </svg>
  );
}

export function HudVersionGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path d="M5 6H15" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 12H19" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 18H14" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18.2" cy="6" r="2" fill="currentColor" />
      <circle cx="20" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}

export function HudPlayGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path d="M7 4L20 12L7 20V4Z" fill="currentColor" />
    </svg>
  );
}

export function HudPlusGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path d="M12 4V20" stroke="currentColor" strokeWidth="2" />
      <path d="M4 12H20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function HudMenuGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <path d="M4 6H20" stroke="currentColor" strokeWidth="2" />
      <path d="M4 12H20" stroke="currentColor" strokeWidth="2" />
      <path d="M4 18H20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
