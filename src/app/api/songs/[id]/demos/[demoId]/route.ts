import { DemoVersionType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody, withApiHandler } from "@/lib/api";
import { deleteDemoForTrack, updateDemoForTrack } from "@/lib/demo-service";
import { requireUser } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{ id: string; demoId: string }>;
};

const updateDemoSchema = z.object({
  versionType: z.nativeEnum(DemoVersionType).optional(),
  noteText: z.string().max(4000).optional().nullable(),
  releaseDate: z.string().max(20).optional().nullable(),
  setAsPrimary: z.boolean().optional(),
  reflection: z
    .object({
      whyMade: z.string().max(4000).optional().nullable(),
      whatChanged: z.string().max(4000).optional().nullable(),
      whatNotWorking: z.string().max(4000).optional().nullable()
    })
    .optional()
    .nullable()
});

export const PATCH = withApiHandler(async (request: Request, context: RouteContext) => {
  const { id, demoId } = await context.params;
  const user = await requireUser();
  const body = await parseJsonBody(request, updateDemoSchema);

  await updateDemoForTrack({
    userId: user.id,
    trackId: id,
    demoId,
    versionType: body.versionType,
    noteText: body.noteText,
    releaseDate: body.releaseDate,
    reflection: body.reflection,
    setAsPrimary: body.setAsPrimary
  });

  return NextResponse.json({ ok: true });
});

export const DELETE = withApiHandler(async (_: Request, context: RouteContext) => {
  const { id, demoId } = await context.params;
  const user = await requireUser();
  await deleteDemoForTrack({
    userId: user.id,
    trackId: id,
    demoId
  });
  return NextResponse.json({ ok: true });
});
