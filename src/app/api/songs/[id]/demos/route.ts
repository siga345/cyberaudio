import { DemoVersionType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, parseJsonBody, withApiHandler } from "@/lib/api";
import { createDemoForTrack } from "@/lib/demo-service";
import { requireUser } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const createDemoSchema = z.object({
  versionType: z.nativeEnum(DemoVersionType),
  noteText: z.string().max(4000).optional().nullable(),
  releaseDate: z.string().max(20).optional().nullable(),
  durationSec: z.number().int().min(0).optional(),
  reflection: z
    .object({
      whyMade: z.string().max(4000).optional().nullable(),
      whatChanged: z.string().max(4000).optional().nullable(),
      whatNotWorking: z.string().max(4000).optional().nullable()
    })
    .optional()
    .nullable()
});

export const POST = withApiHandler(async (request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const user = await requireUser();
  const body = await parseJsonBody(request, createDemoSchema);

  if (body.versionType !== "IDEA_TEXT") {
    throw apiError(400, "Use /api/audio-clips for audio versions.");
  }

  const created = await createDemoForTrack({
    userId: user.id,
    trackId: id,
    versionType: body.versionType,
    durationSec: body.durationSec ?? 0,
    noteText: body.noteText ?? null,
    releaseDate: body.releaseDate ?? null,
    reflection: body.reflection ?? null
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
});
