import { NextResponse } from "next/server";

import { withApiHandler } from "@/lib/api";
import { getSongStages } from "@/lib/song-stages";
import { requireUser } from "@/lib/server-auth";

export const GET = withApiHandler(async () => {
  await requireUser();
  return NextResponse.json(getSongStages().map(({ id, name }) => ({ id, name })));
});
