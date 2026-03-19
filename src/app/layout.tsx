import type { Metadata } from "next";
import localFont from "next/font/local";

import { MusicAppShell } from "@/components/layout/music-app-shell";
import { Providers } from "@/app/providers";

import "./globals.css";

const cyberpunkDisplay = localFont({
  src: "../../Cyberpunk.ttf",
  variable: "--font-display",
  display: "swap"
});

const ocrInterface = localFont({
  src: "../../OCR A Becker RUS-LAT/ocrabeckerrus_lat.otf",
  variable: "--font-body",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Cyberaudio",
  description: "Cyberpunk 2077 inspired workspace for singles, albums, folders, versions and recording."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${cyberpunkDisplay.variable} ${ocrInterface.variable}`}>
        <Providers>
          <MusicAppShell>{children}</MusicAppShell>
        </Providers>
      </body>
    </html>
  );
}
