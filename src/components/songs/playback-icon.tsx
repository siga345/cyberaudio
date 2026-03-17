import { Pause, Play } from "lucide-react";

type PlaybackIconProps = {
  type: "play" | "pause";
  className?: string;
};

export function PlaybackIcon({ type, className = "" }: PlaybackIconProps) {
  if (type === "pause") {
    return <Pause aria-hidden className={`block ${className}`.trim()} strokeWidth={2.4} />;
  }

  return <Play aria-hidden className={`block ${className}`.trim()} fill="currentColor" strokeWidth={2.4} />;
}
