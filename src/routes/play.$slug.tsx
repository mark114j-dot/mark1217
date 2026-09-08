import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { recordPlay } from "@/lib/plays.functions";
import { ArrowLeft, Smile, Users, Copy } from "lucide-react";
import { getClientId, getSavedName, getSavedAvatar, saveName } from "@/lib/game";
import { useAuth } from "@/lib/auth";
import { createNetHost, randomRoomCode, type NetPlayer } from "@/lib/netHost";
import { readCachedOfflineGame } from "@/lib/offlineCache";

const BASE_URL = "https://mark1217.lovable.app";

function cleanSlug(slug: string) {
  return decodeURIComponent(slug).replace(/[-_]+/g, " ").trim();
}

export const Route = createFileRoute("/play/$slug")({
  component: PlayGame,
  validateSearch: (s: Record<string, unknown>) => ({
    room: typeof s.room === "string" && s.room ? s.room.toUpperCase().slice(0, 8) : undefined,
  }),
  head: ({ params }) => {
    const gameName = cleanSlug(params.slug);
    const title = `${gameName}｜免費線上遊戲・多人小遊戲｜畫聊 Doodle`;
    const description = `免費線上遊玩「${gameName}」。免安裝、免註冊，支援多人小遊戲與已支援的離線遊玩功能，開啟瀏覽器即可開始。`;
    const url = `${BASE_URL}/play/${encodeURIComponent(params.slug)}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "畫聊 Doodle" },
        { property: "og:locale", content: "zh_TW" },
        { property: "og:url", content: url },
        { property: "og:image", content: `${BASE_URL}/pwa-icon.png` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: `${BASE_URL}/pwa-icon.png` },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: gameName,
          description,
          url,
          gamePlatform: "Web browser",
          applicationCategory: "GameApplication",
          inLanguage: "zh-TW",
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: "0", priceCurrency: "TWD" },
          publisher: { "@type": "Organization", name: "畫聊 Doodle", url: BASE_URL },
        }),
      }],
    };
  },
});

type Game = {
  id: string; slug: string; name: string; emoji: string; description: string;
  html_content: string | null; play_url: string | null;
  cover_image_url: string | null; instructions: string | null; offline_ok: boolean | null;
};

type Announcement = {
  id: string; kind: string; title: string; body: string;
  block_play: boolean; require_typing: boolean;
};

type OwnedEmote = {
  emote_id: string;
  shop_emotes: { id: string; name: string; gif_url: string; display_mode: "fullscreen" | "bar" } | null;
};

type BroadcastEvent = {
  id: string; room_code: string; gif_url: string;
  display_mode: "fullscreen" | "bar"; sender_name: string | null;
};

function PlayGame() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [blockAnnouncement, setBlockAnnouncement] = useState<Announcement | null>(null);
  const [typedText, setTypedText] = useState("");
  const [owned, setOwned] = useState<OwnedEmote[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [effects, setEffects] = useState<BroadcastEvent[]>([]);
  const seenRef = useRef<Set<string>>(new Set());

  // ---- Multiplayer room ----
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [netPlayers, setNetPlayers] = useState<NetPlayer[]>([]);
  const [netStatus, setNetStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const roomCode = useMemo(() => search.room ?? randomRoomCode(), [search.room]);
  const isOffline = !!game?.offline_ok;
  useEffect(() => {
    if (isOffline) return;
    if (!search.room) navigate({ search: { room: roomCode }, replace: true });
  }, [search.room, roomCode, isOffline]);

  const [nickname, setNickname] = useState("");
  useEffect(() => {
    const saved = getSavedName();
    const fromAccount = (user?.user_metadata?.username as string) ?? user?.email?.split("@")[0];
    setNickname(saved || fromAccount || "");
  }, [user]);

  const meIdentity = useMemo(() => ({
    id: getClientId(),
    name: nickname || "玩家",
    avatar: (user?.user_metadata?.avatar as string) ?? getSavedAvatar(),
  }), [user, nickname]);


  useEffect(() => {
    (async () => {
      const online = typeof navigator === "undefined" ? true : navigator.onLine;
      let row: any = null;
      let message: string | null = null;

      if (!online) {
        // Truly offline: read the local copy immediately, never touch the network.
        row = await readCachedOfflineGame(slug);
        if (!row) message = "目前離線中，這款遊戲尚未下載到裝置";
      } else {
        try {
          const { data, error } = await supabase
            .from("games")
            .select("id,slug,name,emoji,description,html_content,play_url,cover_image_url,instructions,offline_ok")
            .eq("slug", slug).eq("status", "published").maybeSingle();
          if (error) message = error.message;
          row = data;
        } catch (e: any) {
          message = e?.message ?? "連線失敗";
        }
        if (!row) {
          row = await readCachedOfflineGame(slug);
          if (row) message = null;
        }
      }

      if (row) {
        setGame(row as any);
        if (online) recordPlay({ data: { slug } }).catch(() => {});
      } else {
        setErr(message ?? "找不到這款遊戲");
      }
      setLoading(false);
    })();
  }, [slug]);

  // Check for blocking announcements (skipped entirely when offline)
  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("announcements")
          .select("id,kind,title,body,block_play,require_typing")
          .eq("active", true).eq("block_play", true)
          .order("created_at", { ascending: false }).limit(1);
        if (data && data[0]) setBlockAnnouncement(data[0] as Announcement);
      } catch {
        /* offline: never block play */
      }
    })();
  }, []);

  // Load owned emotes for signed-in user
  useEffect(() => {
    if (!user) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("owned_emotes")
          .select("emote_id, shop_emotes(id,name,gif_url,display_mode)")
          .eq("user_id", user.id);
        setOwned((data ?? []) as any);
      } catch {
        /* ignore */
      }
    })();
  }, [user]);

  // Realtime broadcast subscription per slug
  useEffect(() => {
    if (!slug || isOffline) return;
    const channel = supabase
      .channel(`emotes:${slug}:${roomCode}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "emote_broadcasts",
        filter: `room_code=eq.${slug}:${roomCode}`,
      }, (payload) => {
        const ev = payload.new as BroadcastEvent;
        if (seenRef.current.has(ev.id)) return;
        seenRef.current.add(ev.id);
        setEffects((prev) => [...prev, ev]);
        setTimeout(() => setEffects((p) => p.filter((e) => e.id !== ev.id)), 3200);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [slug, roomCode, isOffline]);

  // Multiplayer bridge: the sandboxed game talks to us, we do the networking.