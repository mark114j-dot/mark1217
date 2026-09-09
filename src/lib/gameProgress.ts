export type GameProgress = {
  version: 1;
  slug: string;
  data: unknown;
  updatedAt: number;
};

const prefix = "doodle-game-progress:";

function key(slug: string) {
  return prefix + encodeURIComponent(slug);
}

export function saveGameProgress(slug: string, data: unknown) {
  try {
    const progress: GameProgress = {
      version: 1,
      slug,
      data,
      updatedAt: Date.now(),
    };
    localStorage.setItem(key(slug), JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function loadGameProgress<T = unknown>(slug: string): GameProgress & { data: T } | null {
  try {
    const raw = localStorage.getItem(key(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameProgress;
    if (parsed?.version !== 1 || parsed.slug !== slug) return null;
    return parsed as GameProgress & { data: T };
  } catch {
    return null;
  }
}

export function clearGameProgress(slug: string) {
  try {
    localStorage.removeItem(key(slug));
  } catch {
    // Storage may be unavailable in private/restricted browsing modes.
  }
}

export function requestGameSave(iframe: HTMLIFrameElement, slug: string, data: unknown) {
  saveGameProgress(slug, data);
  iframe.contentWindow?.postMessage(
    { type: "DOODLE_GAME_SAVE", slug, data },
    "*",
  );
}

export function requestGameLoad(iframe: HTMLIFrameElement, slug: string) {
  const progress = loadGameProgress(slug);
  iframe.contentWindow?.postMessage(
    { type: "DOODLE_GAME_LOAD", slug, data: progress?.data ?? null },
    "*",
  );
  return progress;
}

export function installGameProgressBridge(
  iframe: HTMLIFrameElement,
  slug: string,
  onSave?: (data: unknown) => void,
) {
  const handler = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return;
    const message = event.data;
    if (!message || typeof message !== "object") return;

    if (message.type === "DOODLE_GAME_SAVE") {
      saveGameProgress(slug, message.data);
      onSave?.(message.data);
    }

    if (message.type === "DOODLE_GAME_CLEAR") {
      clearGameProgress(slug);
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
