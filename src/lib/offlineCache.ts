// Pre-cache offline-ready ("免連線") games so they still open with no network.
// Data lives in Cache Storage (larger + persistent) under a dedicated cache name.

import { supabase } from "@/integrations/supabase/client";

const CACHE_NAME = "offline-games-v1";
const INDEX_KEY = "https://offline-games.local/index.json";
const MAX_INLINE_IMAGE_BYTES = 250_000;

export type CachedGame = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  description: string | null;
  cover_image_url: string | null;
  instructions: string | null;
  category: string | null;
  play_count: number | null;
  created_at: string;
  html_content: string | null;
  play_url: string | null;
  offline_ok: boolean | null;
};

function cachesAvailable() {
  return typeof window !== "undefined" && "caches" in window;
}

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size > MAX_INLINE_IMAGE_BYTES) return null;
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Fetch every published offline-ok game and store it (HTML + inlined icon) for offline use. */
export async function precacheOfflineGames(): Promise<number> {
  if (!cachesAvailable() || !navigator.onLine) return 0;
  try {
    const { data, error } = await supabase
      .from("games")
      .select(
        "id,slug,name,emoji,description,cover_image_url,instructions,category,play_count,created_at,html_content,play_url,offline_ok",
      )
      .eq("status", "published")
      .eq("offline_ok", true);
    if (error || !data) return 0;


    const games = data as unknown as CachedGame[];
    const prepared: CachedGame[] = [];

    for (const g of games) {
      let cover = g.cover_image_url;
      if (cover && !cover.startsWith("data:")) {
        cover = (await toDataUrl(cover)) ?? cover;
      }
      prepared.push({ ...g, cover_image_url: cover });
    }

    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      INDEX_KEY,
      new Response(JSON.stringify({ savedAt: Date.now(), games: prepared }), {
        headers: { "content-type": "application/json" },
      }),
    );

    // Warm the app shell for the routes those games need.
    const routes = ["/", "/games", ...prepared.map((g) => `/play/${g.slug}`)];
    await Promise.allSettled(
      routes.map(async (r) => {
        try {
          const res = await fetch(r, { credentials: "same-origin" });
          if (res.ok) await cache.put(r, res.clone());
        } catch {
          /* ignore */
        }
      }),
    );

    // Externally hosted offline games: warm their entry document too.
    await Promise.allSettled(
      prepared
        .filter((g) => g.play_url)
        .map(async (g) => {
          try {
            const res = await fetch(g.play_url!, { mode: "no-cors" });
            await cache.put(g.play_url!, res.clone());
          } catch {
            /* ignore */
          }
        }),
    );
  } catch {
    /* offline pre-caching is best-effort */
  }
}

export async function readCachedOfflineGames(): Promise<CachedGame[]> {
  if (!cachesAvailable()) return [];
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(INDEX_KEY);
    if (!res) return [];
    const json = (await res.json()) as { games?: CachedGame[] };
    return json.games ?? [];
  } catch {
    return [];
  }
}

export async function readCachedOfflineGame(slug: string): Promise<CachedGame | null> {
  const games = await readCachedOfflineGames();
  return games.find((g) => g.slug === slug) ?? null;
}
