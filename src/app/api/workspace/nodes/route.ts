import { NextResponse } from "next/server";

import { apiError, withApiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSongStageById } from "@/lib/song-stages";
import { requireUser } from "@/lib/server-auth";
import { buildFolderBreadcrumbs, folderDepthForNode, listUserFoldersTree } from "@/lib/workspace-tree";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SortableNode = {
  pinnedAt: Date | null;
  sortIndex: number;
  updatedAt: Date;
};

function compareWorkspaceNodes<T extends SortableNode>(a: T, b: T) {
  const updatedDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
  if (updatedDiff !== 0) return updatedDiff;

  const aPinnedTime = a.pinnedAt?.getTime() ?? 0;
  const bPinnedTime = b.pinnedAt?.getTime() ?? 0;
  const pinnedDiff = bPinnedTime - aPinnedTime;
  if (pinnedDiff !== 0) return pinnedDiff;

  return a.sortIndex - b.sortIndex;
}

type WorkspaceProjectTrackSnapshot = {
  id: string;
  pathStageId: number | null;
};

type WorkspaceProjectSnapshot = SortableNode & {
  id: string;
  title: string;
  folderId: string | null;
  artistLabel: string | null;
  releaseKind: "SINGLE" | "ALBUM";
  coverType: "GRADIENT" | "IMAGE";
  coverImageUrl: string | null;
  coverPresetKey: string | null;
  coverColorA: string | null;
  coverColorB: string | null;
  tracks: WorkspaceProjectTrackSnapshot[];
  _count: { tracks: number };
};

function mapWorkspaceProjectNode(project: WorkspaceProjectSnapshot) {
  const singleTrackStage = project.releaseKind === "SINGLE" && project.tracks.length === 1
    ? getSongStageById(project.tracks[0]?.pathStageId ?? null)
    : null;

  return {
    id: project.id,
    type: "project" as const,
    title: project.title,
    pinnedAt: project.pinnedAt,
    updatedAt: project.updatedAt,
    sortIndex: project.sortIndex,
    projectMeta: {
      artistLabel: project.artistLabel,
      releaseKind: project.releaseKind,
      singleTrackId: project.releaseKind === "SINGLE" && project.tracks.length === 1 ? project.tracks[0]?.id ?? null : null,
      singleTrackStageName: singleTrackStage?.name ?? null,
      coverType: project.coverType,
      coverImageUrl: project.coverImageUrl,
      coverPresetKey: project.coverPresetKey,
      coverColorA: project.coverColorA,
      coverColorB: project.coverColorB,
      trackCount: project._count?.tracks ?? 0
    }
  };
}

export const GET = withApiHandler(async (request: Request) => {
  const user = await requireUser();
  const parentFolderParam = new URL(request.url).searchParams.get("parentFolderId");
  const parentFolderId = !parentFolderParam || parentFolderParam === "root" ? null : parentFolderParam;

  const folderTree = await listUserFoldersTree(user.id);
  let currentFolder: { id: string; title: string; parentFolderId: string | null; depth: number } | null = null;
  if (parentFolderId) {
    const folder = folderTree.find((node) => node.id === parentFolderId);
    if (!folder) {
      throw apiError(404, "Folder not found");
    }
    currentFolder = {
      id: folder.id,
      title: folder.title,
      parentFolderId: folder.parentFolderId,
      depth: folderDepthForNode(folderTree, folder.id)
    };
  }

  const [folders, currentFolderProjectsRaw] = await Promise.all([
    prisma.folder.findMany({
      where: { userId: user.id, parentFolderId },
      include: {
        _count: { select: { childFolders: true, projects: true } },
        childFolders: {
          select: { id: true, title: true, updatedAt: true, pinnedAt: true, sortIndex: true },
          take: 2
        }
      }
    }),
    prisma.project.findMany({
      where: { userId: user.id, folderId: parentFolderId },
      include: {
        _count: { select: { tracks: true } },
        tracks: {
          select: {
            id: true,
            pathStageId: true
          },
          orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }],
          take: 2
        }
      }
    })
  ]);

  const childFolderIds = folders.map((folder) => folder.id);
  const childFolderProjectsRaw = childFolderIds.length
    ? await prisma.project.findMany({
        where: { userId: user.id, folderId: { in: childFolderIds } },
        include: {
          _count: { select: { tracks: true } },
          tracks: {
            select: {
              id: true,
              pathStageId: true
            },
            orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }],
            take: 2
          }
        }
      })
    : [];

  const currentFolderProjects = currentFolderProjectsRaw as WorkspaceProjectSnapshot[];
  const childFolderProjects = childFolderProjectsRaw as WorkspaceProjectSnapshot[];
  const childFolderProjectsByFolderId = new Map<string, WorkspaceProjectSnapshot[]>();
  for (const project of childFolderProjects) {
    if (!project.folderId) continue;
    const list = childFolderProjectsByFolderId.get(project.folderId) ?? [];
    list.push(project);
    childFolderProjectsByFolderId.set(project.folderId, list);
  }

  const nodes = [
    ...folders.map((folder) => {
      const visibleFolderProjects = childFolderProjectsByFolderId.get(folder.id) ?? [];
      const preview = [
        ...folder.childFolders.map((child) => ({
          id: child.id,
          type: "folder" as const,
          title: child.title,
          updatedAt: child.updatedAt,
          pinnedAt: child.pinnedAt,
          sortIndex: child.sortIndex
        })),
        ...visibleFolderProjects.map((project) => ({
          id: project.id,
          type: "project" as const,
          title: project.title,
          updatedAt: project.updatedAt,
          pinnedAt: project.pinnedAt,
          sortIndex: project.sortIndex,
          releaseKind: project.releaseKind,
          coverType: project.coverType,
          coverImageUrl: project.coverImageUrl,
          coverPresetKey: project.coverPresetKey,
          coverColorA: project.coverColorA,
          coverColorB: project.coverColorB
        }))
      ]
        .sort(compareWorkspaceNodes)
        .slice(0, 2)
        .map((item) =>
          item.type === "folder"
            ? { id: item.id, type: item.type, title: item.title }
            : {
                id: item.id,
                type: item.type,
                title: item.title,
                releaseKind: item.releaseKind,
                coverType: item.coverType,
                coverImageUrl: item.coverImageUrl,
                coverPresetKey: item.coverPresetKey,
                coverColorA: item.coverColorA,
                coverColorB: item.coverColorB
              }
        );

      return {
        id: folder.id,
        type: "folder" as const,
        title: folder.title,
        pinnedAt: folder.pinnedAt?.toISOString() ?? null,
        updatedAt: folder.updatedAt.toISOString(),
        sortIndex: folder.sortIndex,
        itemCount: (folder._count?.childFolders ?? 0) + (folder._count?.projects ?? 0),
        preview
      };
    }),
    ...currentFolderProjects.map((project) => ({
      ...mapWorkspaceProjectNode(project),
      pinnedAt: project.pinnedAt?.toISOString() ?? null,
      updatedAt: project.updatedAt.toISOString()
    }))
  ].sort((a, b) => compareWorkspaceNodes(
    {
      pinnedAt: a.pinnedAt ? new Date(a.pinnedAt) : null,
      updatedAt: new Date(a.updatedAt),
      sortIndex: a.sortIndex
    },
    {
      pinnedAt: b.pinnedAt ? new Date(b.pinnedAt) : null,
      updatedAt: new Date(b.updatedAt),
      sortIndex: b.sortIndex
    }
  ));

  return NextResponse.json({
    currentFolder,
    breadcrumbs: buildFolderBreadcrumbs(folderTree, parentFolderId),
    nodes
  });
});
