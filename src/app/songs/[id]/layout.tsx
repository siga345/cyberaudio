import type { ReactNode } from "react";

import { TrackScreenProvider } from "@/components/songs/track-screen-context";

export default async function TrackLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TrackScreenProvider trackId={id}>{children}</TrackScreenProvider>;
}
