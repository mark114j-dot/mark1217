import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";

/**
 * Fullscreen for a game container. While active, page scrolling is locked
 * so the play area never shifts under the player's fingers.
 */
export function useFullscreen<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onChange = () => setActive(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Lock page scroll + pull-to-refresh while fullscreened
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (active) {
      root.style.overscrollBehavior = "none";
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.inset = "0";
      body.style.width = "100%";
    } else {
      root.style.overscrollBehavior = "";
      body.style.overflow = "";
      body.style.position = "";
      body.style.inset = "";
      body.style.width = "";
    }
    return () => {
      root.style.overscrollBehavior = "";
      body.style.overflow = "";
      body.style.position = "";
      body.style.inset = "";
      body.style.width = "";
    };
  }, [active]);

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (ref.current) {
        const el = ref.current as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      }
    } catch {
      /* fullscreen unavailable (e.g. iPhone Safari) — fail silently */
    }
  }, []);

  return { ref, active, toggle };
}

export function FullscreenButton({
  active,
  onClick,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "離開全螢幕" : "全螢幕遊玩"}
      title={active ? "離開全螢幕" : "全螢幕遊玩"}
      className={`z-30 grid place-items-center w-10 h-10 rounded-xl border-2 border-foreground bg-card/90 shadow-brutal-sm hover:translate-y-0.5 hover:shadow-none transition ${className}`}
    >
      {active ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
    </button>
  );
}
