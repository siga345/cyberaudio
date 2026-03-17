import { promises as fs } from "fs";
import path from "path";

const AUDIO_STORAGE_DIR = path.join(process.cwd(), "data", "audio");

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export async function ensureAudioStorageDir() {
  await fs.mkdir(AUDIO_STORAGE_DIR, { recursive: true });
}

export async function saveAudioFile(file: File) {
  await ensureAudioStorageDir();
  const extension = path.extname(file.name) || ".bin";
  const baseName = path.basename(file.name, extension) || "clip";
  const storageName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${sanitizeFilename(baseName)}${extension.toLowerCase()}`;
  const absolutePath = path.join(AUDIO_STORAGE_DIR, storageName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);
  return {
    relativePath: storageName,
    absolutePath
  };
}

export function resolveAudioPath(relativePath: string) {
  return path.join(AUDIO_STORAGE_DIR, relativePath);
}

export async function deleteAudioFile(relativePath: string | null | undefined) {
  if (!relativePath) return;
  try {
    await fs.unlink(resolveAudioPath(relativePath));
  } catch {
    // File may already be gone.
  }
}
