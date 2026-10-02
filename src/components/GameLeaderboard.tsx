import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, RefreshCw, UserRound } from "lucide-react";

type ScoreRow = {
  id: string;
  user_id: string;
  username: string;
  avatar: string | null;
  score: number;
  duration_ms: number | null;
  created_at: string;
};

type LeaderboardProps = {
  gameId: string;
  gameName: string;
  userId?: string;
  currentScore?: number | null;
  compact?: boolean;
};

type Period = "all" | "today" | "week" | "month";

function startOfPeriod(period: Period) {
  const d = new Date();
  if (period === "today") {
    d.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  } else if (period === "month") {
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
  }
  return d.toISOString();
}

export function GameLeaderboard({ gameId, gameName, userId, currentScore, compact = false }: LeaderboardProps) {
  const [period, setPeriod] = useState<Period>("all");
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("game_scores")
      .select("id,user_id,username,avatar,score,duration_ms,created_at")
      .eq("game_id", gameId)
      .order("score", { ascending: false })
      .limit(200);

    if (period !== "all") query = query.gte("created_at", startOfPeriod(period));

    const { data } = await query;
    const bestByUser = new Map<string, ScoreRow>();
    for (const row of (data ?? []) as ScoreRow[]) {
      const old = bestByUser.get(row.user_id);
      if (!old || row.score > old.score || (row.score === old.score && row.created_at < old.created_at)) {
        bestByUser.set(row.user_id, row);
      }
    }
    setRows([...bestByUser.values()].sort((a, b) => b.score - a.score).slice(0, 20));
    setLoading(false);
  }, [gameId, period]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`leaderboard:${gameId}:${period}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_scores", filter: `game_id=eq.${gameId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, gameId, period]);

  const myRank = useMemo(() => {
    if (!userId) return null;
    const index = rows.findIndex((r) => r.user_id === userId);
    return index >= 0 ? index + 1 : null;
  }, [rows, userId]);

  return (
    <section className={compact ? "rounded-2xl border bg-card p-3" : "border-t border-foreground/15 bg-card p-4"}>
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5" />
        <div className="font-black">{gameName}｜排行榜</div>
        <button onClick={load} className="ml-auto rounded-lg border p-1.5" title="重新整理"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <div className="flex gap-1.5 mb-3">
        {([["all","總榜"],["today","今日"],["week","本週"],["month","本月"]] as [Period,string][]).map(([key,label]) => (
          <button key={key} onClick={() => setPeriod(key)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold ${period === key ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            {label}
          </button>
        ))}
      </div>
      {currentScore != null && (
        <div className="mb-3 rounded-xl bg-secondary/40 px-3 py-2 text-sm font-bold">
          本局：{currentScore.toLocaleString()} 分
        </div>
      )}
      {loading ? <div className="py-5 text-center text-sm text-muted-foreground">排行榜載入中…</div> :
        rows.length === 0 ? <div className="py-5 text-center text-sm text-muted-foreground">還沒有成績，成為第一個上榜的人！</div> :
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${r.user_id === userId ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/40"}`}>
              <span className="w-7 text-center font-black">{i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}</span>
              <span className="text-lg">{r.avatar || "🎮"}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{r.username}{r.user_id === userId ? "（你）" : ""}</span>
              <span className="font-mono font-black">{r.score.toLocaleString()}</span>
            </div>
          ))}
        </div>}
      {userId && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserRound className="w-3.5 h-3.5" />
          {myRank ? `目前排名 #${myRank}` : "目前尚未進入前 20 名"}
        </div>
      )}
    </section>
  );
}
