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

export const Route = createFileRoute("/games")({
  component: GamesHub,
  head: () => ({
    meta: [
      { title: "遊戲大廳 — 熱門與最新發布的線上遊戲" },
      { name: "description", content: "瀏覽工作室發布的線上遊戲，依熱門、最新與分類挑選，點開圖示立即開始遊玩。" },
      { property: "og:title", content: "遊戲大廳 — 熱門與最新發布的線上遊戲" },
      { property: "og:description", content: "瀏覽工作室發布的線上遊戲，依熱門、最新與分類挑選，點開圖示立即開始遊玩。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
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
  logic: "邏輯推理",
  math: "數感計算",
  speed: "反應速度",
  party: "歡樂派對",
  action: "動作",
  puzzle: "益智解謎",
  card: "卡牌",
  board: "棋盤",
  misc: "其他",
};

const NEW_DAYS = 14;

function isNew(g: PubGame) {
  return Date.now() - new Date(g.created_at).getTime() < NEW_DAYS * 864e5;
}

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

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    checkFn().then((r: any) => setIsAdmin(!!r.isAdmin)).catch(() => setIsAdmin(false));
  }, [user]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("games")
        .select("id,slug,name,emoji,description,cover_image_url,instructions,category,play_count,created_at,html_content,play_url,offline_ok")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      setGames(((data ?? []) as any[]).filter((g) => g.html_content || g.play_url) as PubGame[]);
      setLoading(false);
    })();
  }, []);

  async function handleDelete(g: PubGame) {
    if (!confirm(`${T("confirm_delete")}\n\n「${g.name}」`)) return;
    try {
      await delFn({ data: { id: g.id } });
      toast.success("已刪除");
      setGames((rows) => rows.filter((r) => r.id !== g.id));
    } catch (e: any) {
      toast.error(e.message || "刪除失敗");
    }
  }

  const cats = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => g.category && set.add(g.category));
    return Array.from(set);
  }, [games]);

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
          <Link to="/" className="border-brutal shadow-brutal-sm rounded-lg p-2 bg-card hover:translate-y-0.5 hover:shadow-none transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-black">🎮 遊戲大廳</h1>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-3">
          {([
            { id: "hot", label: "🔥 熱門" },
            { id: "new", label: "🆕 最新發布" },
            { id: "all", label: "📚 全部" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold border-brutal transition ${
                tab === t.id ? "bg-primary text-primary-foreground shadow-brutal-sm" : "bg-card hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setCat("all")}
            className={`rounded-full px-3 py-1 text-xs font-bold border border-foreground/20 transition ${
              cat === "all" ? "bg-secondary text-secondary-foreground" : "bg-card hover:bg-muted"
            }`}
          >
            全部分類
          </button>
          <button
            onClick={() => setOnlyOffline((v) => !v)}
            title="不需網路也能玩的遊戲（進入網站仍需網路）"
            className={`rounded-full px-3 py-1 text-xs font-bold border border-foreground/20 transition ${
              onlyOffline ? "bg-emerald-600 text-white" : "bg-card hover:bg-muted"
            }`}
          >
            📴 免連線
          </button>
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-3 py-1 text-xs font-bold border border-foreground/20 transition ${
                cat === c ? "bg-secondary text-secondary-foreground" : "bg-card hover:bg-muted"
              }`}
            >
              {CAT_LABEL[c] ?? c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-16">載入中…</div>
        ) : list.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            目前還沒有發布的遊戲。
            {isAdmin && (
              <div className="mt-3">
                <Link to="/studio" className="border-brutal shadow-brutal-sm rounded-lg bg-primary text-primary-foreground px-4 py-2 font-bold">
                  前往工作室發布遊戲
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-5">
            {list.map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.4) }}
                className="relative flex flex-col items-center"
              >
                <button
                  onClick={() => navigate({ to: "/play/$slug", params: { slug: g.slug }, search: { room: undefined } })}
                  className="group relative w-full aspect-square rounded-[22%] overflow-hidden border-brutal shadow-brutal bg-card hover:-translate-y-1 hover:shadow-none transition"
                  aria-label={g.name}
                >
                  {g.cover_image_url ? (
                    <img src={g.cover_image_url} alt={`${g.name} 遊戲圖示`} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-4xl sm:text-5xl bg-gradient-to-br from-primary/15 to-secondary/20">
                      {g.emoji ?? "🎮"}
                    </div>
                  )}
                  {g.offline_ok && (
                    <span className="absolute bottom-1 right-1 rounded-full bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5">
                      📴 免連線
                    </span>
                  )}
                  {tab !== "new" && isNew(g) && (
                    <span className="absolute top-1 left-1 rounded-full bg-secondary text-secondary-foreground text-[9px] font-black px-1.5 py-0.5">
                      NEW
                    </span>
                  )}
                </button>

                <div className="mt-1.5 w-full text-center">
                  <div className="text-xs sm:text-sm font-bold truncate">{g.name}</div>
                  <div className="text-[10px] text-muted-foreground">▶ {g.play_count ?? 0}</div>
                </div>

                <button
                  onClick={() => setHowTo(g)}
                  title="怎麼玩"
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-card border border-foreground/25 p-1 shadow-sm hover:bg-muted transition"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(g)}
                    title={T("delete")}
                    className="absolute -bottom-1 -right-1 rounded-full bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 border border-red-300"
                  >
                    🗑
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {howTo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"
          onClick={() => setHowTo(null)}
        >
          <div
            className="bg-card border-brutal shadow-brutal rounded-2xl max-w-md w-full p-5 max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 shrink-0 rounded-[22%] overflow-hidden border border-foreground/20 grid place-items-center text-3xl bg-muted">
                {howTo.cover_image_url ? (
                  <img src={howTo.cover_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  howTo.emoji ?? "🎮"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl font-black truncate">{howTo.name}</h2>
                <p className="text-xs text-muted-foreground">{howTo.description}</p>
              </div>
              <button onClick={() => setHowTo(null)} className="p-1 rounded hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="font-bold mt-4 mb-1 text-sm">📖 怎麼玩</h3>
            <p className="text-sm whitespace-pre-wrap text-foreground/85">
              {howTo.instructions?.trim() || "這款遊戲還沒有填寫玩法說明，點開直接體驗看看吧！"}
            </p>

            <button
              onClick={() => {
                const slug = howTo.slug;
                setHowTo(null);
                navigate({ to: "/play/$slug", params: { slug }, search: { room: undefined } });
              }}
              className="mt-4 w-full border-brutal shadow-brutal-sm rounded-lg bg-primary text-primary-foreground py-2 font-bold hover:translate-y-0.5 hover:shadow-none transition"
            >
              ▶ 開始遊玩
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
