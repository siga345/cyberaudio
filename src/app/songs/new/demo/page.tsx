import { redirect } from "next/navigation";

export default function LegacyNewDemoPage() {
  redirect("/songs/record");
}
