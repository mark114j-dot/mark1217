const STORAGE_KEY = "doodle_error_log_v1";
const MAX_ENTRIES = 20;

type ErrorEntry = {
  id: string;
  time: string;
  message: string;
  source: "runtime" | "unhandled-rejection" | "route" | "manual";
  path: string;
};

function safeMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  if (typeof error === "string") return error.slice(0, 500);
  try { return JSON.stringify(error).slice(0, 500); } catch { return "Unknown error"; }
}

export function reportClientError(error: unknown, source: ErrorEntry["source"] = "manual") {
  const entry: ErrorEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: new Date().toISOString(),
    message: safeMessage(error),
    source,
    path: typeof window === "undefined" ? "server" : window.location.pathname,
  };

  console.error(`[Doodle:${source}]`, error);

  if (typeof window === "undefined") return;
  try {
    const current = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]") as ErrorEntry[];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...current].slice(0, MAX_ENTRIES)));
  } catch {
    // Error reporting must never create another application error.
  }
}

export function getClientErrorLog(): ErrorEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]") as ErrorEntry[];
  } catch {
    return [];
  }
}

export function clearClientErrorLog() {
  if (typeof window !== "undefined") sessionStorage.removeItem(STORAGE_KEY);
}

export function installGlobalErrorReporter() {
  if (typeof window === "undefined") return () => undefined;

  const onError = (event: ErrorEvent) => reportClientError(event.error || event.message, "runtime");
  const onRejection = (event: PromiseRejectionEvent) => reportClientError(event.reason, "unhandled-rejection");

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
