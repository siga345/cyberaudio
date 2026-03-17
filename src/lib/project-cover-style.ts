import type { CSSProperties } from "react";

import type { ProjectReleaseKind } from "@/lib/songs-project-navigation";

export type ProjectCoverRenderInput = {
  releaseKind?: ProjectReleaseKind | null;
  coverType: "GRADIENT" | "IMAGE";
  coverImageUrl?: string | null;
  coverPresetKey?: string | null;
  coverColorA?: string | null;
  coverColorB?: string | null;
};

type ProjectCoverPreset = {
  key: string;
  releaseKind: ProjectReleaseKind;
  label: string;
  colorA: string;
  colorB: string;
  gradientCss?: string;
};

export const PROJECT_COVER_PRESETS: ProjectCoverPreset[] = [
  {
    key: "signal-burst",
    releaseKind: "SINGLE",
    label: "Signal Burst",
    colorA: "#F8EF00",
    colorB: "#FF7A18",
    gradientCss:
      "radial-gradient(circle at 14% 18%, rgba(248,239,0,0.55), transparent 24%), radial-gradient(circle at 82% 22%, rgba(255,122,24,0.44), transparent 34%), linear-gradient(145deg, #171300 0%, #473c00 30%, #a94900 68%, #ff7a18 100%)"
  },
  {
    key: "magenta-fuse",
    releaseKind: "SINGLE",
    label: "Magenta Fuse",
    colorA: "#FF4FD8",
    colorB: "#6F7CFF",
    gradientCss:
      "radial-gradient(circle at 18% 20%, rgba(255,79,216,0.4), transparent 30%), radial-gradient(circle at 86% 18%, rgba(111,124,255,0.34), transparent 36%), linear-gradient(145deg, #12081b 0%, #421166 42%, #8d1d8f 76%, #ff4fd8 100%)"
  },
  {
    key: "cyan-grid",
    releaseKind: "SINGLE",
    label: "Cyan Grid",
    colorA: "#49F6FF",
    colorB: "#2A7BFF",
    gradientCss:
      "radial-gradient(circle at 16% 20%, rgba(73,246,255,0.45), transparent 28%), linear-gradient(145deg, #05131d 0%, #0f2e5a 36%, #157ec8 72%, #49f6ff 100%)"
  },
  {
    key: "night-market",
    releaseKind: "ALBUM",
    label: "Night Market",
    colorA: "#F8EF00",
    colorB: "#FF4FD8",
    gradientCss:
      "radial-gradient(circle at 12% 14%, rgba(248,239,0,0.4), transparent 24%), radial-gradient(circle at 84% 18%, rgba(255,79,216,0.32), transparent 30%), radial-gradient(circle at 18% 82%, rgba(73,246,255,0.2), transparent 30%), linear-gradient(140deg, #05070d 0%, #11172a 26%, #6b1575 62%, #f8ef00 100%)"
  },
  {
    key: "midnight-grid",
    releaseKind: "ALBUM",
    label: "Midnight Grid",
    colorA: "#49F6FF",
    colorB: "#FF4FD8",
    gradientCss:
      "radial-gradient(circle at 14% 16%, rgba(73,246,255,0.38), transparent 24%), radial-gradient(circle at 84% 24%, rgba(255,79,216,0.22), transparent 30%), linear-gradient(145deg, #040814 0%, #0a1a36 38%, #0c4c80 64%, #3e2d8c 100%)"
  }
];

export function projectDefaultCoverForKind(releaseKind: ProjectReleaseKind) {
  const preset =
    PROJECT_COVER_PRESETS.find((item) => item.releaseKind === releaseKind) ??
    PROJECT_COVER_PRESETS.find((item) => item.key === "signal-burst")!;
  return {
    coverPresetKey: preset.key,
    coverColorA: preset.colorA,
    coverColorB: preset.colorB
  };
}

export function buildProjectCoverStyle(input: ProjectCoverRenderInput): CSSProperties {
  if (input.coverType === "IMAGE" && input.coverImageUrl) {
    return {
      backgroundImage: `url(${input.coverImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center"
    };
  }

  const preset = input.coverPresetKey ? PROJECT_COVER_PRESETS.find((item) => item.key === input.coverPresetKey) : null;
  if (preset?.gradientCss) {
    return { background: preset.gradientCss };
  }

  return {
    background: `linear-gradient(145deg, ${input.coverColorA || "#49F6FF"}, ${input.coverColorB || "#FF4FD8"})`
  };
}
