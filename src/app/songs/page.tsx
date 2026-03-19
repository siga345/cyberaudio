import { WorkspaceBrowser } from "@/components/songs/workspace-browser";

export default function SongsPage() {
  return (
    <div className="pb-24">
      <div className="mx-auto w-full max-w-[1440px]">
        <WorkspaceBrowser parentFolderId={null} libraryMode floatingCreateButton />
      </div>
    </div>
  );
}
