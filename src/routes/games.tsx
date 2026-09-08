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
          const { data } = await supabase.from("games").select("id,slug,name,emoji,description,cover_image_url,instructions,category,play_count,created_at,html_content,play_url,offline_ok").eq("status", "published").order("created_at", { ascending: false });
          rows = (data ?? []) as any[];
        } catch { rows = []; }
        if (rows.length === 0) {
          rows = await readCachedOfflineGames();
          if (rows.length > 0) { setOfflineMode(true); setOnlyOffline(true); }
        }
      }
      setGames(rows.filter((g) => g.html_content || g.play_url) as PubGame[]);
      setLoading(false); setCacheInfo(await getOfflineMeta());
    })();
  }, []);

  useEffect(() => {
    const on = () => setOfflineMode(false); const off = () => setOfflineMode(true);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  async function downloadOffline() {
    setCaching(true);
    try { const n = await precacheOfflineGames(); setCacheInfo(await getOfflineMeta()); toast.success(n > 0 ? `已下載 ${n} 款免連線遊戲，斷網也能玩` : "目前沒有可離線下載的遊戲"); }
    catch { toast.error("離線下載失敗，請稍後再試"); }
    finally { setCaching(false); }
  }
  async function handleDelete(g: PubGame) {
    if (!confirm(`${T("confirm_delete")}\n\n「${g.name}」`)) return;
    try { await delFn({ data: { id: g.id } }); toast.success("已刪除"); setGames((rows) => rows.filter((r) => r.id !== g.id)); }
    catch (e: any) { toast.error(e.message || "刪除失敗"); }
  }
  const cats = useMemo(() => Array.from(new Set(games.map((g) => g.category).filter(Boolean) as string[])), [games]);
  const list = useMemo(() => {
    let rows = games.slice();
    if (cat !== "all") rows = rows.filter((g) => (g.category ?? "misc") === cat);
    if (onlyOffline) rows = rows.filter((g) => g.offline_ok);
    if (tab === "hot") rows.sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0));
    else if (tab === "new") rows.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [games, cat, tab, onlyOffline]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Link to="/" className="border-brutal shadow-brutal-sm rounded-lg p-2 bg-card hover:translate-y-0.5 hover:shadow-none transition"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-display text-3xl sm:text-4xl font-black">🎮 免費小遊戲大廳</h1>
        </div>
        <p className="mb-5 max-w-3xl text-sm leading-6 text-muted-foreground">
          在畫聊 Doodle 的免費小遊戲大廳，可以直接玩線上多人遊戲與單人小遊戲，從繪圖猜題、棋盤遊戲到益智解謎、數學數感、邏輯推理與反應挑戰都能找到。免安裝、免註冊，支援的遊戲也能先下載後離線遊玩。
        </p>
        <div className={`mb-4 rounded-xl border-brutal px-3 py-2 text-xs flex flex-wrap items-center gap-2 ${offlineMode ? "bg-amber-50" : "bg-emerald-50"}`}>
          <span className="font-bold">{offlineMode ? "📴 目前離線中" : "🟢 已連線"}</span>
          <span className="text-foreground/70">{cacheInfo.count > 0 ? `已下載 ${cacheInfo.count} 款免連線遊戲，斷網也能直接玩。` : "尚未下載離線遊戲，按右邊按鈕即可存到裝置。"}</span>
          <span className="flex-1" />
          <button onClick={downloadOffline} disabled={caching || offlineMode} className="border-brutal shadow-brutal-sm rounded-lg bg-card px-3 py-1 font-bold disabled:opacity-40">{caching ? "下載中…" : "⬇ 下載離線遊戲"}</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {([{ id: "hot", label: "🔥 熱門" }, { id: "new", label: "🆕 最新發布" }, { id: "all", label: "📚 全部" }] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-full px-4 py-1.5 text-sm font-bold border-brutal transition ${tab === t.id ? "bg-primary text-primary-foreground shadow-brutal-sm" : "bg-card hover:bg-muted"}`}>{t.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setCat("all")} className={`rounded-full px-3 py-1 text-xs font-bold border border-foreground/20 ${cat === "all" ? "bg-secondary text-secondary-foreground" : "bg-card hover:bg-muted"}`}>全部分類</button>
          <button onClick={() => setOnlyOffline((v) => !v)} title="不需網路也能玩的遊戲" className={`rounded-full px-3 py-1 text-xs font-bold border border-foreground/20 ${onlyOffline ? "bg-emerald-600 text-white" : "bg-card hover:bg-muted"}`}>📴 免連線</button>
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`rounded-full px-3 py-1 text-xs font-bold border border-foreground/20 ${cat === c ? "bg-secondary text-secondary-foreground" : "bg-card hover:bg-muted"}`}>{CAT_LABEL[c] ?? c}</button>)}
        </div>
        {loading ? <div className="text-center text-muted-foreground py-16">載入中…</div> : list.length === 0 ? <div className="text-center text-muted-foreground py-16">目前還沒有發布的遊戲。</div> : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-5">
            {list.map((g, i) => (
              <motion.div key={g.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(i * 0.03, 0.4) }} className="relative flex flex-col items-center">
                <button onClick={() => navigate({ to: "/play/$slug", params: { slug: g.slug }, search: { room: undefined } })} className="group relative w-full aspect-square rounded-[22%] overflow-hidden border-brutal shadow-brutal bg-card hover:-translate-y-1 hover:shadow-none transition" aria-label={g.name}>
                  {g.cover_image_url ? <img src={g.cover_image_url} alt={`${g.name} 免費線上小遊戲圖示`} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full grid place-items-center text-4xl sm:text-5xl bg-gradient-to-br from-primary/15 to-secondary/20">{g.emoji ?? "🎮"}</div>}
                  {g.offline_ok && <span className="absolute bottom-1 right-1 rounded-full bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5">📴 免連線</span>}
                  {tab !== "new" && isNew(g) && <span className="absolute top-1 left-1 rounded-full bg-secondary text-secondary-foreground text-[9px] font-black px-1.5 py-0.5">NEW</span>}
                </button>
                <div className="mt-1.5 w-full text-center"><div className="text-xs sm:text-sm font-bold truncate">{g.name}</div><div className="text-[10px] text-muted-foreground">▶ {g.play_count ?? 0}</div></div>
                <button onClick={() => setHowTo(g)} title="怎麼玩" className="absolute -top-1.5 -right-1.5 rounded-full bg-card border border-foreground/25 p-1 shadow-sm hover:bg-muted transition"><Info className="w-3.5 h-3.5" /></button>
                {isAdmin && <button onClick={() => handleDelete(g)} title={T("delete")} className="absolute -bottom-1 -right-1 rounded-full bg-red-100 border border-red-300 p-1 text-red-700"><X className="w-3 h-3" /></button>}
              </motion.div>
            ))}
          </div>
        )}
        {howTo && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setHowTo(null)}><div className="w-full max-w-md rounded-2xl border-brutal shadow-brutal bg-card p-6" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-black">{howTo.emoji ?? "🎮"} {howTo.name}</h2><button onClick={() => setHowTo(null)} className="rounded-full p-2 hover:bg-muted" aria-label="關閉"><X className="w-5 h-5" /></button></div><p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">{howTo.instructions || howTo.description || "目前沒有提供遊戲說明。"}</p><button onClick={() => { setHowTo(null); navigate({ to: "/play/$slug", params: { slug: howTo.slug }, search: { room: undefined } }); }} className="mt-5 w-full border-brutal shadow-brutal-sm rounded-xl bg-primary px-4 py-3 font-display font-bold text-primary-foreground">開始遊玩 →</button></div></div>}
      </div>
    </div>
  );
}
