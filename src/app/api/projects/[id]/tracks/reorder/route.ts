import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, parseJsonBody, withApiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const reorderTracksSchema = z
  .object({
    orderedTrackIds: z.array(z.string().min(1)).min(1)
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const id of value.orderedTrackIds) {
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["orderedTrackIds"],
          message: "orderedTrackIds must be unique"
        });
        return;
      }
      seen.add(id);
    }
  });

export const POST = withApiHandler(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const user = await requireUser();
  const body = await parseJsonBody(request, reorderTracksSchema);

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    select: { id: true }
  });
  if (!project) {
    throw apiError(404, "Project not found");
  }

  const projectTracks = await prisma.track.findMany({
    where: { userId: user.id, projectId: id },
    select: { id: true },
    orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }]
  });

  const expectedIds = projectTracks.map((track) => track.id);
  const actualIds = body.orderedTrackIds;

  if (expectedIds.length !== actualIds.length) {
    throw apiError(400, "orderedTrackIds must include all project tracks");
  }

  const expectedSet = new Set(expectedIds);
  for (const id of actualIds) {
    if (!expectedSet.has(id)) {
      throw apiError(400, "orderedTrackIds contains invalid track for this project");
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const [sortIndex, trackId] of actualIds.entries()) {
      await tx.track.update({
        where: { id: trackId },
        data: { sortIndex }
      });
    }

    await tx.project.update({
      where: { id },
      data: { updatedAt: new Date() }
    });
  });

  return NextResponse.json({ ok: true });
});
