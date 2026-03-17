import type { Metadata } from "next";

import { MusicAppShell } from "@/components/layout/music-app-shell";
import { Providers } from "@/app/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Cyberaudio",
  description: "Локальный workspace для записи треков и контроля версий."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Providers>
          <MusicAppShell>{children}</MusicAppShell>
        </Providers>
      </body>
    </html>
  );
}
