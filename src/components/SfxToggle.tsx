import { Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { sfx, toggleSfx } from "@/lib/sfx";

export function SfxToggle({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(sfx.isEnabled());
  return (
    <button
      onClick={() => { const v = toggleSfx(); setOn(v); if (v) sfx.click(); }}
      title={on ? "關閉音效" : "開啟音效"}
      className={`border-brutal shadow-brutal-sm rounded-xl bg-card p-2 hover:translate-y-0.5 hover:shadow-none transition ${className}`}
    >
      {on ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
    </button>
  );
}