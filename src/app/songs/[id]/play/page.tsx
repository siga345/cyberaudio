import { redirect } from "next/navigation";

export default async function LegacyTrackPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/songs/${id}?player=1`);
}
