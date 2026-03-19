import { redirect } from "next/navigation";

export default async function LegacyTrackRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/songs/record?trackId=${id}`);
}
