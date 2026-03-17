import { promises as fs } from "fs";

import { apiError, withApiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { resolveAudioPath } from "@/lib/audio-clips";
import { requireUser } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{ demoId: string }>;
};

function contentTypeForPath(audioPath: string) {
  if (audioPath.endsWith(".wav")) return "audio/wav";
  if (audioPath.endsWith(".mp3")) return "audio/mpeg";
  if (audioPath.endsWith(".ogg")) return "audio/ogg";
  if (audioPath.endsWith(".m4a")) return "audio/mp4";
  return "audio/webm";
}

export const GET = withApiHandler(async (request: Request, context: RouteContext) => {
  const { demoId } = await context.params;
  const user = await requireUser();
  const demo = await prisma.demo.findFirst({
    where: {
      id: demoId,
      track: {
        userId: user.id
      }
    },
    select: {
      audioPath: true
    }
  });

  if (!demo?.audioPath) {
    throw apiError(404, "Audio clip not found");
  }

  const absolutePath = resolveAudioPath(demo.audioPath);
  const stat = await fs.stat(absolutePath).catch(() => null);
  if (!stat) {
    throw apiError(404, "Audio file missing");
  }

  const rangeHeader = request.headers.get("range");
  const contentType = contentTypeForPath(demo.audioPath);

  if (!rangeHeader) {
    const buffer = await fs.readFile(absolutePath);
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.length),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store"
      }
    });
  }

  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!match) {
    throw apiError(416, "Invalid range request");
  }

  const fileSize = stat.size;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : fileSize - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= fileSize) {
    throw apiError(416, "Invalid range request");
  }

  const handle = await fs.open(absolutePath, "r");
  try {
    const length = end - start + 1;
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, start);
    return new Response(buffer, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(length),
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store"
      }
    });
  } finally {
    await handle.close();
  }
});
