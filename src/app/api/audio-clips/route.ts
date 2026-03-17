import { DemoVersionType } from "@prisma/client";
import { NextResponse } from "next/server";

import { apiError, withApiHandler } from "@/lib/api";
import { createDemoForTrack } from "@/lib/demo-service";
import { requireUser } from "@/lib/server-auth";
import { demoSummarySelect } from "@/lib/track-workbench";
import { prisma } from "@/lib/prisma";

function parseVersionType(value: FormDataEntryValue | null): DemoVersionType {
  if (typeof value !== "string") {
    throw apiError(400, "versionType is required");
  }
  const allowed = Object.values(DemoVersionType);
  if (!allowed.includes(value as DemoVersionType)) {
    throw apiError(400, "Unsupported versionType");
  }
  return value as DemoVersionType;
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser();
  const formData = await request.formData();
  const trackId = formData.get("trackId");
  if (typeof trackId !== "string" || !trackId.trim()) {
    throw apiError(400, "trackId is required");
  }

  const fileField = formData.get("file");
  const file = fileField instanceof File ? fileField : null;
  const versionType = parseVersionType(formData.get("versionType"));
  const durationSec = parseOptionalNumber(formData.get("durationSec")) ?? 0;

  const created = await createDemoForTrack({
    userId: user.id,
    trackId: trackId.trim(),
    versionType,
    durationSec,
    file,
    noteText: typeof formData.get("noteText") === "string" ? String(formData.get("noteText")) : null,
    releaseDate: typeof formData.get("releaseDate") === "string" ? String(formData.get("releaseDate")) : null,
    reflection: {
      whyMade: typeof formData.get("reflectionWhyMade") === "string" ? String(formData.get("reflectionWhyMade")) : null,
      whatChanged:
        typeof formData.get("reflectionWhatChanged") === "string" ? String(formData.get("reflectionWhatChanged")) : null,
      whatNotWorking:
        typeof formData.get("reflectionWhatNotWorking") === "string"
          ? String(formData.get("reflectionWhatNotWorking"))
          : null
    },
    analysis: {
      bpm: parseOptionalNumber(formData.get("analysisBpm")),
      keyRoot: typeof formData.get("analysisKeyRoot") === "string" ? String(formData.get("analysisKeyRoot")) : null,
      keyMode: typeof formData.get("analysisKeyMode") === "string" ? String(formData.get("analysisKeyMode")) : null
    }
  });

  const payload = await prisma.demo.findUniqueOrThrow({
    where: { id: created.id },
    select: demoSummarySelect
  });

  return NextResponse.json(
    {
      id: payload.id,
      audioUrl: payload.audioPath ? `/api/audio-clips/${payload.id}/stream` : null
    },
    { status: 201 }
  );
});
