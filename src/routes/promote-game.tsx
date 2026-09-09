import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { requestGamePromotion } from "@/lib/gamePromotion.functions";

export const Route = createFileRoute("/promote-game")({ component: PromoteGamePage });

type Game = { id: string; name: string; slug: string; play_count: number | null };

function PromoteGamePage() {
  const { user, loading } = useAuth();
  const request = useServerFn(requestGamePromotion);
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("games").select("id,name,slug,play_count").eq("created_by", user.id).eq("status", "published").order("created_at", { ascending: false }).then(({ data }) => setGames((data ?? []) as Game[]));
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!gameId || busy) return;
    setBusy(true);
    try {
      await request({ data: { game_id: gameId, message } });
      toast.success("已送出推廣申請，等待管理員審核");
      await navigate({ to: "/games" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "申請失敗");
    } finally { setBusy(false); }
  }

  if (loading) return <main className="min-h-screen grid place-items-center">讀取中…</main>;
  if (!user) return <main className="min-h-screen grid place-items-center p-6"><div className="border-brutal rounded-2xl bg-card p-6 text-center"><h1 className="font-black text-xl">請先登入</h1><Link to="/login" className="underline">前往登入</Link></div></main>;

  return <main className="min-h-screen bg-background p-4 md:p-8"><div className="mx-auto max-w-2xl space-y-5">
    <div className="flex items-center gap-3"><Link to="/games" className="border-brutal rounded-lg px-3 py-2 bg-card">← 大廳</Link><h1 className="text-2xl md:text-4xl font-black">📣 推廣我的遊戲</h1></div>
    <div className="rounded-2xl border bg-card p-4 text-sm leading-6">想讓自己的遊戲出現在大廳的「推薦遊戲」區？送出申請後由管理員審核。這不是付費廣告，也不需要 AI 點數。</div>
    {games.length === 0 ? <div className="rounded-2xl border p-6 text-center text-muted-foreground">你目前還沒有已發布的遊戲。</div> : <form onSubmit={submit} className="border-brutal shadow-brutal rounded-2xl bg-card p-5 space-y-4">
      <label className="block space-y-1"><span className="font-bold">選擇遊戲</span><select value={gameId} onChange={e => setGameId(e.target.value)} className="w-full border-brutal rounded-xl px-3 py-3 bg-background"><option value="">請選擇</option>{games.map(g => <option key={g.id} value={g.id}>{g.name} · {g.play_count ?? 0} 次遊玩</option>)}</select></label>
      <label className="block space-y-1"><span className="font-bold">推薦文案（選填）</span><input value={message} onChange={e => setMessage(e.target.value)} maxLength={200} placeholder="例如：全新的益智挑戰，快來試試！" className="w-full border-brutal rounded-xl px-3 py-3 bg-background" /></label>
      <button disabled={!gameId || busy} className="w-full border-brutal shadow-brutal rounded-xl px-5 py-3 bg-primary text-primary-foreground font-black disabled:opacity-50">{busy ? "送出中…" : "📣 申請大廳推薦"}</button>
    </form>}
  </div></main>;
}
