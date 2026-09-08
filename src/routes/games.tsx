import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Info, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { checkAdmin, deleteGame } from "@/lib/studio.functions";
import { useAuth } from "@/lib/auth";
import { readCachedOfflineGames, precacheOfflineGames, getOfflineMeta } from "@/lib/offlineCache";

const BASE_URL = "https://mark1217.lovable.app";

export const Route = createFileRoute("/games")({
  component: GamesHub,
  head: () => ({
    meta: [
      { title: "免費小遊戲大廳｜線上多人、益智、棋盤遊戲｜畫聊 Doodle" },
      { name: "description", content: "免費小遊戲大廳「畫聊 Doodle」集合線上多人遊戲、益智解謎、棋盤遊戲、數學數感、邏輯推理與反應遊戲。免安裝、免註冊，開瀏覽器即可遊玩，部分遊戲支援離線。" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { property: "og:title", content: "免費小遊戲大廳｜線上多人、益智、棋盤遊戲" },
      { property: "og:description", content: "免費小遊戲大廳，集合多人連線、益智解謎、棋盤、數學數感、邏輯推理與反應遊戲，免安裝即可玩。" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "畫聊 Doodle" },
      { property: "og:locale", content: "zh_TW" },
      { property: "og:url", content: `${BASE_URL}/games` },
      { property: "og:image", content: `${BASE_URL}/pwa-icon.png` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "免費小遊戲大廳｜畫聊 Doodle" },
      { name: "twitter:description", content: "免費線上多人與單人小遊戲，包含益智、棋盤、邏輯、數感與反應遊戲。" },
      { name: "twitter:image", content: `${BASE_URL}/pwa-icon.png` },
    ],
    links: [{ rel: "canonical", href: `${BASE_URL}/games` }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "免費小遊戲大廳｜線上多人與益智遊戲",
        headline: "免費小遊戲大廳",
        description: "免費線上多人與單人小遊戲集合，包含益智、棋盤、數學、邏輯與反應遊戲。",
        url: `${BASE_URL}/games`,
        inLanguage: "zh-TW",
        isPartOf: { "@type": "WebSite", name: "畫聊 Doodle", url: BASE_URL },
        about: [
          { "@type": "Thing", name: "免費小遊戲" },
          { "@type": "Thing", name: "線上多人遊戲" },
          { "@type": "Thing", name: "益智遊戲" },
          { "@type": "Thing", name: "棋盤遊戲" },
          { "@type": "Thing", name: "數學遊戲" },
        ],
      }),
    }],
  }),
});

type PubGame = {
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

const CAT_LABEL: Record<string, string> = {
  logic: "邏輯推理", math: "數感計算", speed: "反應速度", party: "歡樂派對",
  action: "動作", puzzle: "益智解謎", card: "卡牌", board: "棋盤", misc: "其他",
};
const NEW_DAYS = 14;
function isNew(g: PubGame) { return Date.now() - new Date(g.created_at).getTime() < NEW_DAYS * 864e5; }

function GamesHub() {
  const navigate = useNavigate();
  const [games, setGames] = useState<PubGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"hot" | "new" | "all">("hot");
  const [cat, setCat] = useState<string>("all");
  const [onlyOffline, setOnlyOffline] = useState(false);
  const [howTo, setHowTo] = useState<PubGame | null>(null);
  const T = useT();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const checkFn = useServerFn(checkAdmin);
  const delFn = useServerFn(deleteGame);
  const [offlineMode, setOfflineMode] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<{ savedAt: number; count: number }>({ savedAt: 0, count: 0 });
  const [caching, setCaching] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    checkFn().then((r: any) => setIsAdmin(!!r.isAdmin)).catch(() => setIsAdmin(false));
  }, [user]);

  useEffect(() => {
    (async () => {
      const online = typeof navigator === "undefined" ? true : navigator.onLine;
      let rows: any[] = [];
      if (!online) {
        rows = await readCachedOfflineGames(); setOfflineMode(true); setOnlyOffline(true);
      } else {
        try {
          // Keep the lobby response small. Full HTML is only needed when opening a game.
          const { data } = await supabase.from("games").select("id,slug,name,emoji,description,cover_image_url,instructions,category,play_count,created_at,play_url,offline_ok").eq("status", "published").order("created_at", { ascending: false });
          rows = (data ?? []) as any[];
        } catch { rows = []; }
        if (rows.length === 0) {
          rows = await readCachedOfflineGames();
          if (rows.length > 0) { setOfflineMode(true); setOnlyOffline(true); }
        }
      }
      setGames(rows as PubGame[]);
      setLoading(false); setCacheInfo(await getOfflineMeta());
    })();
  }, []);

  useEffect(() => {
    const onCache = () => getOfflineMeta().then(setCacheInfo);
    window.addEventListener("offline-cache-updated", onCache);
    return () => window.removeEventListener("offline-cache-updated", onCache);
  }, []);

  const visibleGames = useMemo(() => {
    let list = onlyOffline ? games.filter((g) => g.offline_ok) : games;
    if (cat !== "all") list = list.filter((g) => g.category === cat);
    if (tab === "hot") list = [...list].sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
    if (tab === "new") list = list.filter(isNew);
    return list;
  }, [games, onlyOffline, cat, tab]);

  async function cacheOffline() {
    if (caching) return;
    setCaching(true);
    const count = await precacheOfflineGames();
    setCacheInfo(await getOfflineMeta());
    setCaching(false);
    toast.success(count > 0 ? `已準備 ${count} 款離線遊戲` : "目前沒有可快取的離線遊戲");
  }

  async function removeGame(g: PubGame) {
    if (!confirm(`確定刪除「${g.name}」？`)) return;
    try {
      await delFn({ data: { id: g.id } });
      setGames((prev) => prev.filter((x) => x.id !== g.id));
      toast.success("已刪除");
    } catch (e) { toast.error(e instanceof Error ? e.message : "刪除失敗"); }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-8 flex items-center justify-between gap-3">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-muted"><ArrowLeft className="h-4 w-4" />返回首頁</Link>
        <div className="flex items-center gap-2"><button onClick={cacheOffline} disabled={caching} className="rounded-xl border px-3 py-2 text-sm font-bold">{caching ? "準備中…" : `離線快取${cacheInfo.count ? ` (${cacheInfo.count})` : ""}`}</button></div>
      </div>
      <section className="mb-8"><h1 className="text-4xl font-black tracking-tight md:text-5xl">免費小遊戲大廳</h1><p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">在畫聊 Doodle 的免費小遊戲大廳，可以直接玩線上多人遊戲與單人小遊戲，從繪圖猜題、棋盤遊戲到益智解謎、數學數感、邏輯推理與反應挑戰都能找到。免安裝、免註冊，支援的遊戲也能先下載後離線遊玩。</p></section>
      <div className="mb-6 flex flex-wrap gap-2"><button onClick={() => setTab("hot")} className={`rounded-xl px-4 py-2 font-bold ${tab === "hot" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>熱門</button><button onClick={() => setTab("new")} className={`rounded-xl px-4 py-2 font-bold ${tab === "new" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>最新</button><button onClick={() => setTab("all")} className={`rounded-xl px-4 py-2 font-bold ${tab === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>全部</button><button onClick={() => setOnlyOffline((v) => !v)} className={`rounded-xl px-4 py-2 font-bold ${onlyOffline ? "bg-accent" : "bg-muted"}`}>只看可離線</button></div>
      <div className="mb-8 flex flex-wrap gap-2">{["all", ...Object.keys(CAT_LABEL)].map((key) => <button key={key} onClick={() => setCat(key)} className={`rounded-full border px-3 py-1.5 text-sm font-bold ${cat === key ? "bg-foreground text-background" : "bg-card"}`}>{key === "all" ? "全部分類" : CAT_LABEL[key]}</button>)}</div>
      {offlineMode && <div className="mb-6 rounded-2xl border bg-accent/30 p-4 text-sm font-semibold">目前使用本機離線快取。已保存 {cacheInfo.count} 款遊戲。</div>}
      {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-56 animate-pulse rounded-3xl bg-muted" />)}</div> : visibleGames.length === 0 ? <div className="rounded-3xl border p-10 text-center text-muted-foreground">目前沒有符合條件的遊戲。</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleGames.map((g) => <motion.article key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border bg-card shadow-sm"><Link to="/play/$slug" params={{ slug: g.slug }} className="block"><div className="aspect-[16/9] bg-muted">{g.cover_image_url ? <img src={g.cover_image_url} alt={g.name} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-6xl">{g.emoji ?? "🎮"}</div>}</div><div className="p-4"><div className="mb-2 flex items-center justify-between gap-2"><h2 className="line-clamp-1 text-lg font-black">{g.name}</h2>{isNew(g) && <span className="rounded-full bg-secondary px-2 py-1 text-xs font-black">NEW</span>}</div><p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{g.description || "免費小遊戲，立即開始。"}</p><div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{CAT_LABEL[g.category ?? "misc"] ?? "其他"}</span><span>▶ {g.play_count ?? 0}</span></div></div></Link><div className="flex items-center justify-between border-t px-4 py-3"><button onClick={() => setHowTo(g)} className="inline-flex items-center gap-1 text-sm font-bold"><Info className="h-4 w-4" />玩法</button>{isAdmin && <button onClick={() => removeGame(g)} className="text-sm font-bold text-destructive">刪除</button>}</div></motion.article>)}</div>}
      {howTo && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">{howTo.name}｜玩法</h2><button onClick={() => setHowTo(null)} className="icon-button rounded-full p-2" aria-label="關閉"><X className="h-5 w-5" /></button></div><p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{howTo.instructions || "開啟遊戲後依畫面提示操作。"}</p><button onClick={() => { setHowTo(null); navigate({ to: "/play/$slug", params: { slug: howTo.slug } }); }} className="mt-6 w-full rounded-xl bg-primary px-4 py-3 font-black text-primary-foreground">開始遊戲</button></div></div>}
    </main>
  );
}
