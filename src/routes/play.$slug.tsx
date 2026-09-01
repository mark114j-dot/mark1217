import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { recordPlay } from "@/lib/plays.functions";
import { ArrowLeft, Smile, Users, Copy } from "lucide-react";
import { getClientId } from "@/lib/game";
import { useAuth } from "@/lib/auth";
import { createNetHost, randomRoomCode, type NetPlayer } from "@/lib/netHost";
import { readCachedOfflineGame } from "@/lib/offlineCache";

export const Route = createFileRoute("/play/$slug")({
  component: PlayGame,
  validateSearch: (s: Record<string, unknown>) => ({
    room: typeof s.room === "string" && s.room ? s.room.toUpperCase().slice(0, 8) : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: `遊玩 ${params.slug} — 畫聊 Doodle` },
      { name: "description", content: `線上多人遊玩 ${params.slug}，開房間邀請朋友一起同步對戰。` },
      { property: "og:title", content: `遊玩 ${params.slug} — 畫聊 Doodle` },
      { property: "og:description", content: `線上多人遊玩 ${params.slug}，開房間邀請朋友一起同步對戰。` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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

  const meIdentity = useMemo(() => ({
    id: getClientId(),
    name: (user?.user_metadata?.username as string) ?? user?.email?.split("@")[0] ?? "玩家",
    avatar: (user?.user_metadata?.avatar as string) ?? "🐱",
  }), [user]);


  useEffect(() => {
    (async () => {
      let row: any = null;
      let message: string | null = null;
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
        // Offline: serve the pre-cached copy if we have one.
        row = await readCachedOfflineGame(slug);
        if (row) message = null;
      }
      if (row) {
        setGame(row as any);
        recordPlay({ data: { slug } }).catch(() => {});
      } else {
        setErr(message ?? "找不到這款遊戲");
      }
      setLoading(false);
    })();
  }, [slug]);

  // Check for blocking announcements
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id,kind,title,body,block_play,require_typing")
        .eq("active", true).eq("block_play", true)
        .order("created_at", { ascending: false }).limit(1);
      if (data && data[0]) setBlockAnnouncement(data[0] as Announcement);
    })();
  }, []);

  // Load owned emotes for signed-in user
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("owned_emotes")
        .select("emote_id, shop_emotes(id,name,gif_url,display_mode)")
        .eq("user_id", user.id);
      setOwned((data ?? []) as any);
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
  useEffect(() => {
    if (!game || blockAnnouncement || game.offline_ok) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const dispose = createNetHost({
      iframe,
      roomCode,
      gameType: `game:${game.slug}`,
      me: meIdentity,
      onPlayers: setNetPlayers,
      onStatus: setNetStatus,
    });
    return dispose;
  }, [game?.id, roomCode, blockAnnouncement, meIdentity]);


  async function sendEmote(e: OwnedEmote) {
    if (!user || !e.shop_emotes) return;
    setPickerOpen(false);
    await supabase.from("emote_broadcasts").insert({
      room_code: `${slug}:${roomCode}`,
      emote_id: e.shop_emotes.id,
      gif_url: e.shop_emotes.gif_url,
      display_mode: e.shop_emotes.display_mode,
      sender_id: user.id,
      sender_name: (user.user_metadata?.username as string | undefined) ?? null,
    });
  }

  if (loading) return <main className="min-h-screen grid place-items-center bg-background"><div>讀取中…</div></main>;
  if (err || !game) return (
    <main className="min-h-screen grid place-items-center bg-background p-6">
      <div className="border-brutal shadow-brutal rounded-2xl bg-card p-6 text-center">
        <div className="text-5xl mb-2">😢</div>
        <div className="font-display text-xl font-bold mb-2">{err ?? "找不到遊戲"}</div>
        <Link to="/games" className="underline">← 回小遊戲大廳</Link>
      </div>
    </main>
  );

  // Announcement gate
  if (blockAnnouncement) {
    const required = blockAnnouncement.body.trim();
    const match = typedText.trim() === required;
    const canProceed = blockAnnouncement.require_typing ? match : false;
    const kindStyle: Record<string, string> = {
      update: "bg-sky-100 border-sky-500",
      event: "bg-amber-100 border-amber-500",
      maintenance: "bg-slate-100 border-slate-500",
      urgent: "bg-red-100 border-red-600",
    };
    const kindLabel: Record<string, string> = {
      update: "🔔 更新公告", event: "🎉 活動公告", maintenance: "🛠 維護公告", urgent: "🚨 緊急通知",
    };
    return (
      <main className="min-h-screen grid place-items-center bg-background p-4">
        <div className={`w-full max-w-lg border-brutal shadow-brutal rounded-2xl p-5 ${kindStyle[blockAnnouncement.kind] ?? "bg-card"}`}>
          <div className="text-sm font-bold mb-1">{kindLabel[blockAnnouncement.kind] ?? "公告"}</div>
          <h1 className="font-display text-2xl font-bold mb-2">{blockAnnouncement.title}</h1>
          <pre className="whitespace-pre-wrap text-sm mb-3 leading-relaxed">{blockAnnouncement.body}</pre>
          {blockAnnouncement.require_typing ? (
            <>
              <div className="text-xs text-muted-foreground mb-1">請一字不差輸入上方內容才能繼續：</div>
              <textarea
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                rows={4}
                className="w-full border-brutal rounded-lg p-2 text-sm font-mono bg-white"
                placeholder="在此輸入公告內容…"
              />
              <div className="text-xs mt-1">{match ? "✅ 完全一致" : `已輸入 ${typedText.length}/${required.length}`}</div>
              <button
                disabled={!canProceed}
                onClick={() => setBlockAnnouncement(null)}
                className="mt-3 w-full border-brutal shadow-brutal-sm rounded-xl bg-primary text-primary-foreground font-display font-bold py-2 disabled:opacity-40"
              >{canProceed ? "我已了解，繼續遊玩" : "請完整輸入"}</button>
            </>
          ) : (
            <Link to="/games" className="block text-center underline mt-2">回大廳</Link>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-foreground/15 px-4 py-2 flex items-center gap-3 bg-card">
        <Link to="/games" className="border-brutal shadow-brutal-sm rounded-lg p-1.5 hover:translate-y-0.5 hover:shadow-none transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-2xl">{game.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold truncate">{game.name}</div>
          <div className="text-xs text-muted-foreground truncate">{game.description}</div>
        </div>
        {user && owned.length > 0 && !game.offline_ok && (
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="border-brutal shadow-brutal-sm rounded-lg p-1.5 bg-primary/10 hover:translate-y-0.5 hover:shadow-none transition"
            title="送出 GIF 表情"
          >
            <Smile className="w-4 h-4" />
          </button>
        )}
      </header>
      {game.offline_ok ? (
        <div className="border-b border-foreground/15 px-4 py-1.5 flex items-center gap-2 bg-emerald-50 text-xs text-emerald-800">
          <span className="rounded-full bg-emerald-600 text-white font-bold px-2 py-0.5">📴 免連線</span>
          <span>這款是單機遊戲，載入後即使斷網也能繼續玩。</span>
        </div>
      ) : (
      <div className="border-b border-foreground/15 px-4 py-1.5 flex items-center gap-2 bg-secondary/30 text-xs flex-wrap">
        <span className="font-bold">🏠 房號</span>
        <code className="font-mono font-bold tracking-widest border-brutal rounded px-2 py-0.5 bg-card">{roomCode}</code>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(`${window.location.origin}/play/${slug}?room=${roomCode}`);
          }}
          className="border-brutal shadow-brutal-sm rounded px-2 py-0.5 bg-card font-bold inline-flex items-center gap-1"
        >
          <Copy className="w-3 h-3" /> 複製邀請連結
        </button>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Users className="w-3.5 h-3.5" /> {netPlayers.length || 1} 人在房內
        </span>
        <span className="flex-1" />
        <span className={netStatus === "connected" ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
          {netStatus === "connected" ? "● 已連線" : netStatus === "connecting" ? "○ 連線中…" : "● 已斷線"}
        </span>
        {netPlayers.length > 0 && (
          <span className="flex items-center gap-0.5">
            {netPlayers.slice(0, 8).map((p) => (
              <span key={p.id} title={p.name} className="text-base leading-none">{p.avatar}</span>
            ))}
          </span>
        )}
      </div>
      )}
      <div className="flex-1 relative bg-black">
        {game.play_url ? (
          <iframe
            ref={iframeRef}
            src={game.play_url}
            title={game.name}
            className="absolute inset-0 w-full h-full"
            sandbox="allow-scripts allow-pointer-lock"
            referrerPolicy="no-referrer"
            allow="autoplay; fullscreen; gamepad"
            loading="lazy"
          />
        ) : game.html_content ? (
          <iframe
            ref={iframeRef}
            srcDoc={game.html_content}
            title={game.name}
            className="absolute inset-0 w-full h-full bg-white"
            sandbox="allow-scripts allow-pointer-lock"
            referrerPolicy="no-referrer"
            allow="autoplay; fullscreen; gamepad"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-white">此遊戲尚未上傳內容</div>
        )}
        {/* Emote overlays */}
        {effects.map((ev) => (
          <div
            key={ev.id}
            className={
              ev.display_mode === "fullscreen"
                ? "pointer-events-none absolute inset-0 grid place-items-center bg-black/40 animate-in fade-in"
                : "pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center"
            }
          >
            <img
              src={ev.gif_url}
              alt=""
              className={ev.display_mode === "fullscreen" ? "max-w-[90%] max-h-[90%] drop-shadow-2xl" : "h-24 drop-shadow-2xl"}
              referrerPolicy="no-referrer"
            />
            {ev.sender_name && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white font-bold drop-shadow">{ev.sender_name}</div>
            )}
          </div>
        ))}
        {/* Emote picker */}
        {pickerOpen && (
          <div className="absolute right-2 top-2 z-20 bg-card border-brutal shadow-brutal rounded-xl p-2 max-w-[260px] max-h-[70vh] overflow-auto">
            <div className="text-xs font-bold mb-1">選一個表情送出</div>
            <div className="grid grid-cols-3 gap-1">
              {owned.map((e) => e.shop_emotes && (
                <button key={e.emote_id} onClick={() => sendEmote(e)}
                  className="border border-foreground/20 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary">
                  <img src={e.shop_emotes.gif_url} alt={e.shop_emotes.name} className="w-full aspect-square object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {game.instructions && (
        <div className="border-t border-foreground/15 px-4 py-2 text-xs text-muted-foreground bg-card">
          <span className="font-bold text-foreground">說明：</span> {game.instructions}
        </div>
      )}
    </main>
  );
}