"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiFetch, apiFetchJson } from "@/lib/client-fetch";
import { projectDefaultCoverForKind } from "@/lib/project-cover-style";
import { pickPreferredPlaybackDemo } from "@/lib/songs-playback-helpers";
import { getProjectOpenHref, type ProjectReleaseKind } from "@/lib/songs-project-navigation";
import { useSongsPlayback, type SongsPlaybackItem } from "@/components/songs/songs-playback-provider";
import { HudChip, HudOverlayMenu, HudPanel, HudScreen, HudTopBar } from "@/components/layout/hud-shell";
import { DeleteFolderModal } from "@/components/songs/delete-folder-modal";
import {
  HudFolderGlyph,
  HudPlusGlyph,
  HudPlayGlyph,
  HudProjectGlyph,
  HudRecordGlyph
} from "@/components/songs/hud-glyphs";
import { MoveNodeModal } from "@/components/songs/move-node-modal";
import { WorkspaceFolderTile } from "@/components/songs/workspace-folder-tile";
import { WorkspaceGrid } from "@/components/songs/workspace-grid";
import { WorkspaceProjectTile } from "@/components/songs/workspace-project-tile";
import type { FolderListItem, WorkspaceNode, WorkspaceNodesResponse, WorkspaceProjectNode } from "@/components/songs/workspace-types";
import { cn } from "@/lib/utils";

type WorkspaceBrowserProps = {
  parentFolderId: string | null;
  externalQuery?: string;
  showHeader?: boolean;
  showCreateActions?: boolean;
  libraryMode?: boolean;
  minimalRoot?: boolean;
  floatingCreateButton?: boolean;
  className?: string;
  onChanged?: () => Promise<void> | void;
};

type FolderDeletePromptState = {
  id: string;
  title: string;
};

type ProjectRenamePromptState = {
  id: string;
  initialTitle: string;
  value: string;
};

type ProjectDeletePromptState = {
  id: string;
  title: string;
  trackCount: number;
};

type ProjectDetailForPlayback = {
  id: string;
  title: string;
  coverType: "GRADIENT" | "IMAGE";
  coverImageUrl?: string | null;
  coverColorA?: string | null;
  coverColorB?: string | null;
  tracks: Array<{
    id: string;
    title: string;
    pathStage?: { id: number; name: string } | null;
    primaryDemo?: {
      id: string;
      audioUrl?: string | null;
      createdAt?: string;
      duration: number;
      versionType: "IDEA_TEXT" | "DEMO" | "ARRANGEMENT" | "NO_MIX" | "MIXED" | "MASTERED";
    } | null;
    demos: Array<{
      id: string;
      audioUrl?: string | null;
      createdAt?: string;
      duration: number;
      versionType: "IDEA_TEXT" | "DEMO" | "ARRANGEMENT" | "NO_MIX" | "MIXED" | "MASTERED";
    }>;
  }>;
};

function buildFoldersById(folders: FolderListItem[]) {
  return new Map(folders.map((folder) => [folder.id, folder]));
}

function getFolderDepthLocal(folders: FolderListItem[], folderId: string): number {
  const byId = buildFoldersById(folders);
  let depth = 0;
  let cursor: string | null = folderId;
  const seen = new Set<string>();
  while (cursor) {
    if (seen.has(cursor)) return 99;
    seen.add(cursor);
    const node = byId.get(cursor);
    if (!node) return 99;
    depth += 1;
    cursor = node.parentFolderId;
  }
  return depth;
}

function isDescendantLocal(folders: FolderListItem[], folderId: string, maybeDescendantId: string) {
  const byId = buildFoldersById(folders);
  let cursor: string | null = maybeDescendantId;
  const seen = new Set<string>();
  while (cursor) {
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    if (cursor === folderId) return true;
    cursor = byId.get(cursor)?.parentFolderId ?? null;
  }
  return false;
}

function getFolderSubtreeDepthLocal(folders: FolderListItem[], folderId: string): number {
  const childrenByParent = new Map<string | null, FolderListItem[]>();
  for (const folder of folders) {
    const bucket = childrenByParent.get(folder.parentFolderId ?? null) ?? [];
    bucket.push(folder);
    childrenByParent.set(folder.parentFolderId ?? null, bucket);
  }
  function depthFrom(id: string): number {
    const children = childrenByParent.get(id) ?? [];
    if (!children.length) return 1;
    return 1 + Math.max(...children.map((child) => depthFrom(child.id)));
  }
  return depthFrom(folderId);
}

function defaultFolderDeleteError(responsePayload: { error?: string } | null) {
  return responsePayload?.error || "Не удалось удалить папку.";
}

async function fetcher<T>(url: string): Promise<T> {
  return apiFetchJson<T>(url);
}

function getWorkspaceHref(folderId: string | null) {
  return folderId ? `/songs/folders/${folderId}` : "/songs";
}

export function WorkspaceBrowser({
  parentFolderId,
  externalQuery,
  showHeader = true,
  showCreateActions = true,
  libraryMode = false,
  minimalRoot = false,
  floatingCreateButton = false,
  className,
  onChanged
}: WorkspaceBrowserProps) {
  const router = useRouter();
  const playback = useSongsPlayback();
  const [localQuery, setLocalQuery] = useState("");
  const [error, setError] = useState("");
  const [menuKey, setMenuKey] = useState("");
  const [actionLoadingKey, setActionLoadingKey] = useState("");
  const [playLoadingProjectId, setPlayLoadingProjectId] = useState("");
  const [moveNode, setMoveNode] = useState<WorkspaceNode | null>(null);
  const [deleteFolderPrompt, setDeleteFolderPrompt] = useState<FolderDeletePromptState | null>(null);
  const [deleteEmptyFolderPrompt, setDeleteEmptyFolderPrompt] = useState<FolderDeletePromptState | null>(null);
  const [renameProjectPrompt, setRenameProjectPrompt] = useState<ProjectRenamePromptState | null>(null);
  const [deleteProjectPrompt, setDeleteProjectPrompt] = useState<ProjectDeletePromptState | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectReleaseKind, setNewProjectReleaseKind] = useState<ProjectReleaseKind>("ALBUM");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);

  const query = externalQuery ?? localQuery;
  const isLibraryMode = libraryMode || minimalRoot;

  const {
    data: workspace,
    isLoading: workspaceLoading,
    refetch: refetchWorkspace
  } = useQuery({
    queryKey: ["workspace-nodes", parentFolderId ?? "root"],
    queryFn: () => fetcher<WorkspaceNodesResponse>(`/api/workspace/nodes?parentFolderId=${parentFolderId ?? "root"}`)
  });

  const { data: allFolders = [], refetch: refetchFolders } = useQuery({
    queryKey: ["workspace-all-folders"],
    queryFn: () => fetcher<FolderListItem[]>("/api/folders")
  });

  const nodes = useMemo(() => workspace?.nodes ?? [], [workspace?.nodes]);
  const filteredNodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return nodes;
    return nodes.filter((node) => node.title.toLowerCase().includes(needle));
  }, [nodes, query]);
  const levelFolderCount = nodes.filter((node) => node.type === "folder").length;
  const levelProjectCount = nodes.filter((node) => node.type === "project").length;
  const visibleFolderCount = filteredNodes.filter((node) => node.type === "folder").length;
  const visibleProjectCount = filteredNodes.filter((node) => node.type === "project").length;

  async function refreshAll() {
    await Promise.all([refetchWorkspace(), refetchFolders(), onChanged?.()]);
  }

  async function createFolder() {
    if (!newFolderTitle.trim()) return;
    setCreatingFolder(true);
    setError("");
    try {
      const response = await apiFetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newFolderTitle.trim(), parentFolderId })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Не удалось создать папку.");
      }
      setNewFolderTitle("");
      setShowCreateFolder(false);
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать папку.");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function createProject() {
    if (!newProjectTitle.trim()) return;
    setCreatingProject(true);
    setError("");
    try {
      const defaults = projectDefaultCoverForKind(newProjectReleaseKind);
      const response = await apiFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newProjectTitle.trim(),
          folderId: parentFolderId,
          releaseKind: newProjectReleaseKind,
          coverType: "GRADIENT",
          coverPresetKey: defaults.coverPresetKey,
          coverColorA: defaults.coverColorA,
          coverColorB: defaults.coverColorB
        })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Не удалось создать проект.");
      }
      setNewProjectTitle("");
      setShowCreateProject(false);
      setNewProjectReleaseKind("ALBUM");
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать проект.");
    } finally {
      setCreatingProject(false);
    }
  }

  async function patchFolder(folderId: string, payload: Record<string, unknown>) {
    const response = await apiFetch(`/api/folders/${folderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || "Не удалось выполнить действие с папкой.");
    }
  }

  async function patchProject(projectId: string, payload: Record<string, unknown>) {
    const response = await apiFetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || "Project action failed");
    }
  }

  async function togglePin(node: WorkspaceNode) {
    const key = `${node.type}:${node.id}`;
    setActionLoadingKey(key);
    setError("");
    setMenuKey("");
    try {
      if (node.type === "folder") {
        await patchFolder(node.id, { pinned: !node.pinnedAt });
      } else {
        await patchProject(node.id, { pinned: !node.pinnedAt });
      }
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось обновить pin.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function renameProject(projectId: string, nextTitle: string) {
    const key = `project:${projectId}`;
    setActionLoadingKey(key);
    setError("");
    setMenuKey("");
    try {
      await patchProject(projectId, { title: nextTitle });
      setRenameProjectPrompt(null);
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось переименовать проект.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function deleteProject(projectId: string, trackCount: number) {
    const key = `project:${projectId}`;
    setActionLoadingKey(key);
    setError("");
    setMenuKey("");
    try {
      const response = await apiFetch(
        `/api/projects/${projectId}${trackCount > 0 ? "?force=1" : ""}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Не удалось удалить проект.");
      }
      setDeleteProjectPrompt(null);
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить проект.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function emptyFolder(folderId: string) {
    const key = `folder:${folderId}`;
    setActionLoadingKey(key);
    setError("");
    setMenuKey("");
    try {
      const response = await apiFetch(`/api/folders/${folderId}/empty`, { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Не удалось очистить папку.");
      }
      setDeleteFolderPrompt(null);
      setDeleteEmptyFolderPrompt(null);
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось очистить папку.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function deleteFolder(node: Extract<WorkspaceNode, { type: "folder" }>, mode?: "delete" | "delete_all") {
    const key = `folder:${node.id}`;
    setActionLoadingKey(key);
    setError("");
    setMenuKey("");
    try {
      const suffix = mode ? `?mode=${mode}` : "";
      const response = await apiFetch(`/api/folders/${node.id}${suffix}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; details?: { code?: string } }
          | null;
        if (payload?.details?.code === "FOLDER_NOT_EMPTY" && !mode) {
          setDeleteFolderPrompt({ id: node.id, title: node.title });
          return;
        }
        throw new Error(defaultFolderDeleteError(payload));
      }
      setDeleteFolderPrompt(null);
      setDeleteEmptyFolderPrompt(null);
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить папку.");
    } finally {
      setActionLoadingKey("");
    }
  }

  function requestDeleteFolder(node: Extract<WorkspaceNode, { type: "folder" }>) {
    setError("");
    setMenuKey("");
    if (node.itemCount > 0) {
      setDeleteFolderPrompt({ id: node.id, title: node.title });
      return;
    }
    setDeleteEmptyFolderPrompt({ id: node.id, title: node.title });
  }

  function requestProjectRename(node: WorkspaceProjectNode) {
    setError("");
    setMenuKey("");
    setRenameProjectPrompt({ id: node.id, initialTitle: node.title, value: node.title });
  }

  function requestProjectDelete(node: WorkspaceProjectNode) {
    setError("");
    setMenuKey("");
    setDeleteProjectPrompt({
      id: node.id,
      title: node.title,
      trackCount: node.projectMeta.trackCount
    });
  }

  function submitProjectRename() {
    if (!renameProjectPrompt) return;
    const nextTitle = renameProjectPrompt.value.trim();
    if (!nextTitle || nextTitle === renameProjectPrompt.initialTitle) {
      setRenameProjectPrompt(null);
      return;
    }
    void renameProject(renameProjectPrompt.id, nextTitle);
  }

  function submitProjectDelete() {
    if (!deleteProjectPrompt) return;
    void deleteProject(deleteProjectPrompt.id, deleteProjectPrompt.trackCount);
  }

  function submitEmptyFolderDelete() {
    if (!deleteEmptyFolderPrompt) return;
    const fallbackNode: Extract<WorkspaceNode, { type: "folder" }> = {
      id: deleteEmptyFolderPrompt.id,
      title: deleteEmptyFolderPrompt.title,
      type: "folder",
      pinnedAt: null,
      updatedAt: new Date().toISOString(),
      sortIndex: 0,
      itemCount: 0,
      preview: []
    };
    setDeleteEmptyFolderPrompt(null);
    void deleteFolder(fallbackNode, "delete");
  }

  async function moveCurrentNode(targetFolderId: string | null) {
    if (!moveNode) return;
    const key = `${moveNode.type}:${moveNode.id}`;
    setActionLoadingKey(key);
    setError("");
    try {
      if (moveNode.type === "folder") {
        await patchFolder(moveNode.id, { parentFolderId: targetFolderId });
      } else {
        await patchProject(moveNode.id, { folderId: targetFolderId });
      }
      setMoveNode(null);
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось переместить элемент.");
    } finally {
      setActionLoadingKey("");
    }
  }

  function folderMoveDisabledReason(node: WorkspaceNode | null, targetFolderId: string | null): string | null {
    if (!node || node.type !== "folder") return null;
    if (targetFolderId === node.id) return "same";
    if (!targetFolderId) return null;
    if (isDescendantLocal(allFolders, node.id, targetFolderId)) return "descendant";
    const targetDepth = getFolderDepthLocal(allFolders, targetFolderId);
    const subtreeDepth = getFolderSubtreeDepthLocal(allFolders, node.id);
    if (targetDepth + subtreeDepth > 3) return "depth";
    return null;
  }

  async function groupNodes(source: WorkspaceNode, target: WorkspaceNode) {
    setError("");
    try {
      const response = await apiFetch("/api/workspace/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: { type: source.type, id: source.id },
          target: { type: target.type, id: target.id },
          currentParentFolderId: parentFolderId
        })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Не удалось сгруппировать элементы.");
      }
      await refreshAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сгруппировать элементы.");
      throw e;
    }
  }

  function canGroup(source: WorkspaceNode, target: WorkspaceNode) {
    if (source.id === target.id && source.type === target.type) return false;
    if (source.type === "folder" && target.type === "project") return false;
    if (source.type === "folder" && target.type === "folder") {
      if (isDescendantLocal(allFolders, source.id, target.id)) return false;
      const targetDepth = getFolderDepthLocal(allFolders, target.id);
      const subtreeDepth = getFolderSubtreeDepthLocal(allFolders, source.id);
      if (targetDepth + subtreeDepth > 3) return false;
    }
    return true;
  }

  async function playProjectFromCard(projectId: string) {
    setPlayLoadingProjectId(projectId);
    setError("");
    try {
      const detail = await apiFetchJson<ProjectDetailForPlayback>(`/api/projects/${projectId}`);
      const coverType: "image" | "gradient" = detail.coverType === "IMAGE" ? "image" : "gradient";
      const queue: SongsPlaybackItem[] = [];
      for (const track of detail.tracks ?? []) {
        const preferredDemo = pickPreferredPlaybackDemo(track);
        if (!preferredDemo) continue;
        queue.push({
          demoId: preferredDemo.id,
          src: `/api/audio-clips/${preferredDemo.id}/stream`,
          title: track.title,
          subtitle: `${detail.title} • ${track.pathStage?.name ?? "Без статуса"}`,
          linkHref: `/songs/${track.id}`,
          durationSec: preferredDemo.duration,
          trackId: track.id,
          projectId: detail.id,
          versionType: preferredDemo.versionType,
          queueGroupType: "project",
          queueGroupId: detail.id,
          cover: {
            type: coverType,
            imageUrl: detail.coverImageUrl ?? null,
            colorA: detail.coverColorA ?? null,
            colorB: detail.coverColorB ?? null
          },
          meta: {
            projectTitle: detail.title,
            pathStageName: track.pathStage?.name ?? undefined
          }
        });
      }
      if (!queue.length) {
        setError("В проекте пока нет аудио-версий для воспроизведения.");
        return;
      }
      playback.playQueue(queue, 0, { type: "project", projectId: detail.id, title: detail.title });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось запустить проект.");
    } finally {
      setPlayLoadingProjectId("");
    }
  }

  const folderToDelete = deleteFolderPrompt
    ? (filteredNodes.find((node) => node.type === "folder" && node.id === deleteFolderPrompt.id) ??
      workspace?.nodes.find((node) => node.type === "folder" && node.id === deleteFolderPrompt.id) ??
      null)
    : null;

  function openCreateProject(kind: ProjectReleaseKind) {
    setNewProjectReleaseKind(kind);
    setShowCreateProject(true);
    setShowCreateMenu(false);
  }

  const browserGrid = (
    <>
      {error ? (
        <p
          className={cn(
            "rounded-[18px] border border-brand-magenta/50 bg-brand-magenta/10 px-4 py-3 text-sm text-brand-magenta",
            isLibraryMode ? "" : "mt-4"
          )}
        >
          {error}
        </p>
      ) : null}

      <div className={cn(isLibraryMode ? "" : "mt-5")}>
        {workspaceLoading ? (
          <div
            className={cn(
              "rounded-[22px] border border-brand-border bg-[rgba(14,7,12,0.86)] p-4 text-sm text-brand-muted",
              isLibraryMode ? "min-h-[14rem]" : ""
            )}
          >
            Загрузка workspace...
          </div>
        ) : (
          <>
            <WorkspaceGrid
              nodes={filteredNodes}
              enableGrouping
              canGroup={canGroup}
              onGroup={groupNodes}
              renderNode={({ node, dragState, bindDrag }) => {
                const key = `${node.type}:${node.id}`;
                const menuOpen = menuKey === key;
                const menu = (
                  <div
                    className="absolute right-0 top-11 z-10 min-w-[220px] rounded-[20px] border border-brand-border bg-[rgba(12,6,10,0.98)] p-2 shadow-neon"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {node.type === "folder" ? (
                      <>
                        <button
                          type="button"
                          className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-cyan hover:bg-brand-cyan/10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void togglePin(node);
                          }}
                        >
                          {node.pinnedAt ? "Открепить" : "Закрепить"}
                        </button>
                        <button
                          type="button"
                          className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-cyan hover:bg-brand-cyan/10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setMoveNode(node);
                            setMenuKey("");
                          }}
                        >
                          Переместить
                        </button>
                        <button
                          type="button"
                          className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-cyan hover:bg-brand-cyan/10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void emptyFolder(node.id);
                          }}
                        >
                          Очистить
                        </button>
                        <div className="my-1 h-px bg-brand-border/40" />
                        <button
                          type="button"
                          className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-magenta hover:bg-brand-magenta/10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            requestDeleteFolder(node);
                          }}
                        >
                          Удалить
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href={getProjectOpenHref({
                            id: node.id,
                            releaseKind: node.projectMeta.releaseKind ?? "ALBUM",
                            singleTrackId: node.projectMeta.singleTrackId ?? null
                          })}
                          className="block rounded-[14px] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-brand-cyan hover:bg-brand-cyan/10"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuKey("");
                          }}
                        >
                          Открыть
                        </Link>
                        <button
                          type="button"
                          className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-cyan hover:bg-brand-cyan/10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void togglePin(node);
                          }}
                        >
                          {node.pinnedAt ? "Открепить" : "Закрепить"}
                        </button>
                        <button
                          type="button"
                          className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-cyan hover:bg-brand-cyan/10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setMoveNode(node);
                            setMenuKey("");
                          }}
                        >
                          Переместить
                        </button>
                        <button
                          type="button"
                          className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-cyan hover:bg-brand-cyan/10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            requestProjectRename(node);
                          }}
                        >
                          Переименовать
                        </button>
                        <div className="my-1 h-px bg-brand-border/40" />
                        <button
                          type="button"
                          className="block w-full rounded-[14px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-brand-magenta hover:bg-brand-magenta/10"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            requestProjectDelete(node);
                          }}
                        >
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                );

                if (node.type === "folder") {
                  return (
                    <WorkspaceFolderTile
                      key={key}
                      node={node}
                      menuOpen={menuOpen}
                      onToggleMenu={() => setMenuKey((prev) => (prev === key ? "" : key))}
                      menuContent={menu}
                      dragState={dragState}
                      tileProps={bindDrag}
                    />
                  );
                }

                return (
                  <WorkspaceProjectTile
                    key={key}
                    node={node}
                    menuOpen={menuOpen}
                    onToggleMenu={() => setMenuKey((prev) => (prev === key ? "" : key))}
                    menuContent={menu}
                    dragState={dragState}
                    tileProps={bindDrag}
                    onPlay={() => void playProjectFromCard(node.id)}
                    playLoading={playLoadingProjectId === node.id}
                  />
                );
              }}
            />

            {!filteredNodes.length ? (
              <div
                className={cn(
                  "rounded-[22px] border border-dashed border-brand-border bg-[rgba(16,7,12,0.86)] p-5 text-sm text-brand-muted",
                  isLibraryMode ? "mt-6" : "mt-4"
                )}
              >
                В этом уровне пока пусто.
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {isLibraryMode ? (
        <section className={cn("space-y-4", className)}>
          {workspace?.currentFolder ? (
            <header className="flex items-center gap-3 px-1 pb-1">
              <Link
                href={getWorkspaceHref(workspace.currentFolder.parentFolderId)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] border border-brand-border bg-[rgba(18,7,12,0.88)] text-brand-cyan transition hover:border-brand-cyan/60 hover:text-brand-primary"
                aria-label="Назад"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-brand-muted">Папка</p>
                <h1 className="truncate font-[var(--font-display)] text-[1.9rem] uppercase tracking-[0.08em] text-brand-cyan">
                  {workspace.currentFolder.title}
                </h1>
              </div>
            </header>
          ) : null}
          {browserGrid}
        </section>
      ) : (
        <HudScreen className={className}>
          {showHeader ? (
            <HudTopBar
              kicker={workspace?.currentFolder ? "Folder Node" : "Workspace Matrix"}
              title={workspace?.currentFolder?.title ?? "Projects / Folders"}
              description={
                workspace?.currentFolder
                  ? "Внутри папки доступны вложенные узлы каталога, быстрые действия и переходы к синглам или альбомам."
                  : "Главный экран каталога. Здесь пользователь сразу видит свои папки, синглы и альбомы без промежуточного recorder-landing."
              }
              breadcrumbs={
                workspace?.breadcrumbs?.map((crumb) => ({
                  href: crumb.id === null ? "/songs" : crumb.id ? `/songs/folders/${crumb.id}` : undefined,
                  label: crumb.title
                })) ?? [{ label: "Workspace" }]
              }
              tabs={[
                { href: "/songs", label: "Workspace", active: parentFolderId === null, icon: <HudProjectGlyph /> },
                { href: "/songs/record", label: "Recorder", icon: <HudRecordGlyph /> },
                { href: "/songs/archive", label: "Archive", icon: <HudPlayGlyph /> }
              ]}
              stats={[
                { label: "Folders", value: levelFolderCount, tone: "cyan" },
                { label: "Projects", value: levelProjectCount, tone: "yellow" },
                { label: "Visible", value: filteredNodes.length, tone: "red" }
              ]}
              action={
                showCreateActions ? (
                  <Button className="min-w-[13rem]" onClick={() => setShowCreateMenu(true)}>
                    <HudPlusGlyph />
                    New Command
                  </Button>
                ) : null
              }
            />
          ) : null}

          <HudPanel
            kicker="Node Scan"
            title="Workspace Browser"
            description="Поиск, фильтрация и группировка на текущем уровне каталога."
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              {externalQuery === undefined ? (
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
                  <Input
                    value={localQuery}
                    onChange={(event) => setLocalQuery(event.target.value)}
                    placeholder="Search current level"
                    className="h-11 pl-9"
                  />
                </label>
              ) : (
                <div className="rounded-[18px] border border-brand-border bg-[rgba(20,7,13,0.86)] px-4 py-3 text-sm text-brand-muted">
                  Внешний поисковый запрос активен.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <HudChip tone="muted">Visible folders {visibleFolderCount}</HudChip>
                <HudChip tone="muted">Visible projects {visibleProjectCount}</HudChip>
                {workspace?.currentFolder ? <HudChip tone="cyan">Depth {workspace.currentFolder.depth + 1}</HudChip> : null}
              </div>
            </div>
            {browserGrid}
          </HudPanel>
        </HudScreen>
      )}

      {floatingCreateButton && showCreateActions ? (
        <>
          {showCreateMenu ? (
            <button
              type="button"
              className="fixed inset-0 z-[54] bg-[rgba(2,0,7,0.28)]"
              onClick={() => setShowCreateMenu(false)}
              aria-label="Close create menu"
            />
          ) : null}
          {showCreateMenu ? (
            <div className="fixed bottom-24 right-4 z-[60] flex flex-col items-end gap-3 md:bottom-28 md:right-6">
              {[
                {
                  label: "Новая запись",
                  tone: "text-brand-primary",
                  border: "border-brand-primary/50",
                  bg: "bg-[rgba(255,230,0,0.12)]",
                  icon: <HudRecordGlyph className="h-4 w-4" />,
                  onClick: () => {
                    setShowCreateMenu(false);
                    router.push("/songs/record");
                  }
                },
                {
                  label: "Новый сингл",
                  tone: "text-brand-cyan",
                  border: "border-brand-cyan/40",
                  bg: "bg-[rgba(85,247,255,0.08)]",
                  icon: <HudProjectGlyph className="h-4 w-4" />,
                  onClick: () => openCreateProject("SINGLE")
                },
                {
                  label: "Новый альбом",
                  tone: "text-brand-cyan",
                  border: "border-brand-cyan/40",
                  bg: "bg-[rgba(85,247,255,0.08)]",
                  icon: <HudProjectGlyph className="h-4 w-4" />,
                  onClick: () => openCreateProject("ALBUM")
                },
                {
                  label: "Новая папка",
                  tone: "text-brand-cyan",
                  border: "border-brand-cyan/40",
                  bg: "bg-[rgba(85,247,255,0.08)]",
                  icon: <HudFolderGlyph className="h-4 w-4" />,
                  onClick: () => {
                    setShowCreateMenu(false);
                    setShowCreateFolder(true);
                  }
                }
              ].map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={cn(
                    "inline-flex min-h-[3rem] items-center gap-3 rounded-full border px-4 py-3 text-sm uppercase tracking-[0.14em] shadow-neon backdrop-blur-md transition hover:-translate-y-0.5",
                    action.border,
                    action.bg,
                    action.tone
                  )}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setShowCreateMenu((prev) => !prev)}
            className="fixed bottom-5 right-4 z-[60] grid h-16 w-16 place-items-center rounded-full border border-brand-primary/80 bg-[linear-gradient(180deg,#fff56b,#ffdf00)] text-[#10070d] shadow-[0_18px_48px_rgba(255,230,0,0.24)] transition hover:scale-[1.03] hover:brightness-105 md:bottom-6 md:right-6"
            aria-label="Create new"
          >
            <HudPlusGlyph className={cn("h-7 w-7 transition-transform", showCreateMenu ? "rotate-45" : "")} />
          </button>
        </>
      ) : null}

      {!floatingCreateButton ? (
        <HudOverlayMenu
          open={showCreateMenu}
          title="Create New Node"
          subtitle="Выбери точку входа: прямой вход в рекордер или создание новой сущности каталога."
          onClose={() => setShowCreateMenu(false)}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              className="hud-panel rounded-[22px] px-4 py-4 text-left transition hover:border-brand-primary/60"
              onClick={() => {
                setShowCreateMenu(false);
                router.push("/songs/record");
              }}
            >
              <div className="flex items-center gap-3">
                <HudRecordGlyph className="text-brand-primary" />
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-brand-primary">Recorder</p>
                  <p className="mt-1 text-xs leading-5 text-brand-muted">Сразу открыть запись новой сессии.</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              className="hud-panel rounded-[22px] px-4 py-4 text-left transition hover:border-brand-cyan/60"
              onClick={() => openCreateProject("SINGLE")}
            >
              <div className="flex items-center gap-3">
                <HudProjectGlyph className="text-brand-cyan" />
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-brand-cyan">Create Single</p>
                  <p className="mt-1 text-xs leading-5 text-brand-muted">Новый single, который откроется в track HUD.</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              className="hud-panel rounded-[22px] px-4 py-4 text-left transition hover:border-brand-cyan/60"
              onClick={() => openCreateProject("ALBUM")}
            >
              <div className="flex items-center gap-3">
                <HudProjectGlyph className="text-brand-cyan" />
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-brand-cyan">Create Album</p>
                  <p className="mt-1 text-xs leading-5 text-brand-muted">Новый album control room с будущим треклистом.</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              className="hud-panel rounded-[22px] px-4 py-4 text-left transition hover:border-brand-cyan/60"
              onClick={() => {
                setShowCreateMenu(false);
                setShowCreateFolder(true);
              }}
            >
              <div className="flex items-center gap-3">
                <HudFolderGlyph className="text-brand-cyan" />
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-brand-cyan">Create Folder</p>
                  <p className="mt-1 text-xs leading-5 text-brand-muted">Создать новую папку на текущем уровне.</p>
                </div>
              </div>
            </button>
          </div>
        </HudOverlayMenu>
      ) : null}

      <MoveNodeModal
        open={Boolean(moveNode)}
        node={moveNode}
        folders={allFolders}
        loading={Boolean(actionLoadingKey)}
        onClose={() => setMoveNode(null)}
        onMove={(targetFolderId) => void moveCurrentNode(targetFolderId)}
        getTargetDisabledReason={(targetFolderId) => {
          if (!moveNode) return null;
          if (moveNode.type === "project") return null;
          return folderMoveDisabledReason(moveNode, targetFolderId);
        }}
      />

      <DeleteFolderModal
        open={Boolean(deleteFolderPrompt)}
        folderTitle={deleteFolderPrompt?.title ?? ""}
        busy={Boolean(actionLoadingKey)}
        onCancel={() => setDeleteFolderPrompt(null)}
        onEmptyFolder={() => deleteFolderPrompt && void emptyFolder(deleteFolderPrompt.id)}
        onDeleteEverything={() => {
          if (!deleteFolderPrompt) return;
          const node = (folderToDelete as Extract<WorkspaceNode, { type: "folder" }> | null) ?? {
            id: deleteFolderPrompt.id,
            title: deleteFolderPrompt.title,
            type: "folder",
            pinnedAt: null,
            updatedAt: new Date().toISOString(),
            sortIndex: 0,
            itemCount: 0,
            preview: []
          };
          void deleteFolder(node, "delete_all");
        }}
      />

      <Modal
        open={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        title="Create Folder"
        description="Новый узел каталога на текущем уровне workspace."
        widthClassName="max-w-lg"
      >
        <div className="space-y-4">
          <Input
            value={newFolderTitle}
            onChange={(event) => setNewFolderTitle(event.target.value)}
            placeholder="Folder title"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreateFolder(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createFolder()} disabled={creatingFolder || !newFolderTitle.trim()}>
              {creatingFolder ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        title={newProjectReleaseKind === "SINGLE" ? "Create Single" : "Create Album"}
        description={
          newProjectReleaseKind === "SINGLE"
            ? "Single project opens directly in track HUD as soon as the first track appears."
            : "Album project opens in a dedicated control room with tracklist management."
        }
        widthClassName="max-w-lg"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <HudChip tone={newProjectReleaseKind === "SINGLE" ? "yellow" : "muted"}>Single</HudChip>
            <HudChip tone={newProjectReleaseKind === "ALBUM" ? "cyan" : "muted"}>Album</HudChip>
          </div>
          <Input
            value={newProjectTitle}
            onChange={(event) => setNewProjectTitle(event.target.value)}
            placeholder={newProjectReleaseKind === "SINGLE" ? "Single title" : "Album title"}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreateProject(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createProject()} disabled={creatingProject || !newProjectTitle.trim()}>
              {creatingProject ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {deleteEmptyFolderPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(2,5,12,0.74)] p-3 pt-16 backdrop-blur-sm md:items-center md:p-6"
          onClick={() => {
            if (actionLoadingKey) return;
            setDeleteEmptyFolderPrompt(null);
          }}
        >
          <div
            className="cyber-panel w-full max-w-md rounded-3xl p-4 shadow-neon"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-brand-ink">Удалить папку?</h3>
            <p className="mt-2 text-sm text-brand-muted">
              Папка <span className="font-medium text-brand-ink">«{deleteEmptyFolderPrompt.title}»</span> пустая. Подтверди удаление.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteEmptyFolderPrompt(null)}
                disabled={Boolean(actionLoadingKey)}
              >
                Отмена
              </Button>
              <Button onClick={submitEmptyFolderDelete} disabled={Boolean(actionLoadingKey)}>
                {actionLoadingKey === `folder:${deleteEmptyFolderPrompt.id}` ? "Удаляем..." : "Удалить"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {renameProjectPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(2,5,12,0.74)] p-3 pt-16 backdrop-blur-sm md:items-center md:p-6"
          onClick={() => {
            if (actionLoadingKey) return;
            setRenameProjectPrompt(null);
          }}
        >
          <div
            className="cyber-panel w-full max-w-md rounded-3xl p-4 shadow-neon"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-brand-ink">Переименовать проект</h3>
            <p className="mt-2 text-sm text-brand-muted">Новое название проекта:</p>
            <Input
              value={renameProjectPrompt.value}
              onChange={(event) =>
                setRenameProjectPrompt((prev) => (prev ? { ...prev, value: event.target.value } : prev))
              }
              className="mt-3"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRenameProjectPrompt(null)} disabled={Boolean(actionLoadingKey)}>
                Отмена
              </Button>
              <Button
                onClick={submitProjectRename}
                disabled={Boolean(actionLoadingKey) || !renameProjectPrompt.value.trim()}
              >
                {actionLoadingKey === `project:${renameProjectPrompt.id}` ? "Сохраняем..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteProjectPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(2,5,12,0.74)] p-3 pt-16 backdrop-blur-sm md:items-center md:p-6"
          onClick={() => {
            if (actionLoadingKey) return;
            setDeleteProjectPrompt(null);
          }}
        >
          <div
            className="cyber-panel w-full max-w-md rounded-3xl p-4 shadow-neon"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-brand-ink">Удалить проект?</h3>
            <p className="mt-2 text-sm text-brand-muted">
              {deleteProjectPrompt.trackCount > 0
                ? `Проект «${deleteProjectPrompt.title}» будет удален вместе со всеми песнями и версиями.`
                : `Проект «${deleteProjectPrompt.title}» пустой и будет удален.`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteProjectPrompt(null)} disabled={Boolean(actionLoadingKey)}>
                Отмена
              </Button>
              <Button onClick={submitProjectDelete} disabled={Boolean(actionLoadingKey)}>
                {actionLoadingKey === `project:${deleteProjectPrompt.id}` ? "Удаляем..." : "Удалить"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
