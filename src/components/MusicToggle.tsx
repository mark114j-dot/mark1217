import { Music, VolumeX } from "lucide-react";
import { useMusic } from "@/lib/music";

export function MusicToggle({ className = "" }: { className?: string }) {
  const { enabled, toggle } = useMusic();
  return (
    <button
      onClick={toggle}
      title={enabled ? "關閉音樂" : "開啟音樂"}
      className={`border-brutal shadow-brutal-sm rounded-xl bg-card p-2 hover:translate-y-0.5 hover:shadow-none transition ${className}`}
    >
      {enabled ? <Music className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
    </button>
  );
}