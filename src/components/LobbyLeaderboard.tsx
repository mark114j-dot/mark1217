import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Trophy, Gamepad2, Medal } from "lucide-react";

type GameRow = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  cover_image_url: string | null;
};

type ScoreRow = {
  id: string;
  game_id: string;
  user_id: string;
  username: string;
  avatar: string | null;
  score: number;
  created_at: string;
};

type Period = "all" | "today" | "week";

function periodStart(period: Period) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === "today") return d.toISOString();
  if (period === "week") {
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  }
  return d.toISOString();
}

export function LobbyLeaderboard() {
  const [period, setPeriod] = useState<Period>("all");
  const [games, setGames] = useState<GameRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: gameData }, { data: scoreData }] = await Promise.all([
      supabase.from("games").select("id,slug,name,emoji,cover_image_url").eq("status", "published"),
      (() => {
        let q = supabase.from("game_scores")
          .select("id,game_id,user_id,username,avatar,score,created_at")
          .order("score", { ascending: false })
          .limit(1000);
        if (period !== "all") q = q.gte("created_at", periodStart(period));
        return q;
      })(),
    ]);
    setGames((gameData ?? []) as GameRow[]);
    setScores((scoreData ?? []) as ScoreRow[]);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`lobby-leaderboard:${period}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_scores" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, period]);

  const gameMap = useMemo(() => new Map(games.map((g) => [g.id, g])), [games]);

  const bestScores = useMemo(() => {
    const map = new Map<string, ScoreRow>();
    for (const row of scores) {
      const key = `${row.game_id}:${row.user_id}`;
      const old = map.get(key);
      if (!old || row.score > old.score || (row.score === old.score && row.created_at < old.created_at)) {
        map.set(key, row);
      }
    }
    return [...map.values()].sort((a, b) => b.score - a.score);
  }, [scores]);

  const top = bestScores.slice(0, 10);

  return (
    <section className="mb-10 overflow-hidden rounded-3xl border-2 border-foreground/20 bg-card shadow-lg">
      <div className="bg-foreground px-5 py-5 text-background md:px-7">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-background/10">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black">遊戲排行榜</h2>
            <p className="text-sm text-background/70">所有遊戲的最高分會自動儲存，更新後立即同步。</p>
          </div>
          <button onClick={load} disabled={loading} className="rounded-xl border border-background/30 p-2 hover:bg-background/10" title="重新整理">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          {([["all","總榜"],["today","今日"],["week","本週"]] as [Period,string][]).map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)} className={`rounded-xl px-4 py-2 text-sm font-black ${period === key ? "bg-background text-foreground" : "bg-background/10"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="py-10 text-center text-muted-foreground">排行榜載入中…</div>
        ) : top.length === 0 ? (
          <div className="rounded-2xl bg-muted/50 p-8 text-center">
            <Trophy className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="font-black">還沒有成績</p>
            <p className="mt-1 text-sm text-muted-foreground">玩一局並送出分數，就會出現在這裡。</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {top.map((row, index) => {
              const game = gameMap.get(row.game_id);
              if (!game) return null;
              return (
                <Link key={row.id} to="/play/$slug" params={{ slug: game.slug }} className="group flex items-center gap-3 rounded-2xl border bg-muted/30 p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background text-lg font-black">
                    {index < 3 ? ["🥇","🥈","🥉"][index] : `#${index + 1}`}
                  </div>
                  {game.cover_image_url ? (
                    <img src={game.cover_image_url} alt="" className="h-12 w-16 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="grid h-12 w-16 shrink-0 place-items-center rounded-xl bg-background text-2xl">{game.emoji ?? "🎮"}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground"><Gamepad2 className="h-3.5 w-3.5" />{game.name}</div>
                    <div className="truncate font-black">{row.avatar ?? "🎮"} {row.username}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black tabular-nums">{row.score.toLocaleString()}</div>
                    <div className="text-[10px] font-bold text-muted-foreground">最高分</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
          <Medal className="h-4 w-4" />
          每款遊戲的成績都會永久保存在排行榜資料庫
        </div>
      </div>
    </section>
  );
}
