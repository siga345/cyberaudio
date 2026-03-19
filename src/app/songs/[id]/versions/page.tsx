import { redirect } from "next/navigation";

export default async function LegacyTrackVersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/songs/${id}`);
}
