"use client";

import { usePathname } from "next/navigation";

import { SongsFullPlayerModal } from "@/components/songs/songs-full-player-modal";
import { SongsMiniPlayerDock } from "@/components/songs/songs-mini-player-dock";
import { SongsPlaybackProvider } from "@/components/songs/songs-playback-provider";
import { cn } from "@/lib/utils";

export function MusicAppShell({ children }: { children: React.ReactNode }) {
  return (
    <SongsPlaybackProvider>
      <MusicShellContent>{children}</MusicShellContent>
    </SongsPlaybackProvider>
  );
}

function MusicShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalonePreview = pathname === "/icon-preview";
  const isSessionRoute = pathname === "/songs/record";
  const isWideRoute = pathname.startsWith("/songs");

  if (isStandalonePreview) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-ink">
      <main
        className={cn(
          "relative z-10 mx-auto w-full px-3 pb-36 pt-4 md:px-6 md:pb-44 md:pt-8",
          isSessionRoute ? "max-w-[1500px]" : isWideRoute ? "max-w-[1440px]" : "max-w-[42rem]"
        )}
      >
        {children}
      </main>
      <SongsMiniPlayerDock />
      <SongsFullPlayerModal />
    </div>
  );
}
