import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { createCreatorInvitation, listMyCreatorGames } from "@/lib/creatorCollaboration.functions";

export const Route = createFileRoute("/my-games")({ component: MyGamesPage });

type Game = { id: string; slug: string; name: string; role: string; version: number; created_at: string };

function MyGamesPage() {
  const { user, loading } = useAuth();
  const listFn = useServerFn(listMyCreatorGames);
  const inviteFn = useServerFn(createCreatorInvitation);
  const [games, setGames] = useState<Game[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listFn().then((rows: any) => setGames(rows ?? [])).catch((e) => toast.error(e instanceof Error ? e.message : "載入失敗"));
  }, [user]);

  async function invite(game: Game) {
    if (busy) return;
    setBusy(game.id);
    try {
      const token = await inviteFn({ data: { game_id: game.id } });
      const url = `${window.location.origin}/game-invite/${token}`;
      await navigator.clipboard?.writeText(url);
      toast.success("邀請連結已建立並複製");
      window.prompt("把這個連結傳給其他創作者：", url);
    } catch (e) { toast.error(e instanceof Error ? e.message : "建立邀請失敗"); }
    finally { setBusy(null); }
  }

  if (loading) return <main className="min-h-screen grid place-items-center">讀取中…</main>;
  if (!user) return <main className="min-h-screen grid place-items-center p-6"><div className="rounded-2xl border p-6 text-center"><h1 className="text-2xl font-black">請先登入</h1><Link to="/login" className="mt-4 inline-block rounded-xl border px-5 py-3 font-bold">前往登入</Link></div></main>;

  return <main className="min-h-screen bg-background p-4 md:p-8"><div className="mx-auto max-w-5xl space-y-6">
    <div className="flex items-center gap-3 flex-wrap"><Link to="/games" className="rounded-xl border px-3 py-2 font-bold">← 遊戲大廳</Link><Link to="/create-game" className="rounded-xl border px-3 py-2 font-bold">＋ 製作遊戲</Link><h1 className="w-full text-3xl md:text-4xl font-black">🎮 我的遊戲</h1></div>
    <p className="text-muted-foreground">管理你建立或參與的遊戲。遊戲建立者可以產生邀請連結，讓其他登入玩家加入共同創作。</p>
    {games.length === 0 ? <div className="rounded-2xl border bg-card p-8 text-center">你目前還沒有創作者遊戲。</div> : <div className="grid gap-4 md:grid-cols-2">{games.map((game) => <article key={game.id} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-black">{game.name}</h2><p className="mt-1 text-sm text-muted-foreground">角色：{game.role === "owner" ? "建立者" : "共同創作者"} · v{game.version}</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">{game.role}</span></div><div className="mt-5 flex flex-wrap gap-2"><Link to="/play/$slug" params={{ slug: game.slug }} className="rounded-xl border px-4 py-2 font-bold">▶ 遊玩</Link><Link to="/game-editor/$gameId" params={{ gameId: game.id }} className="rounded-xl border bg-primary px-4 py-2 font-bold text-primary-foreground">✏️ 編輯</Link>{game.role === "owner" && <button onClick={() => invite(game)} disabled={busy === game.id} className="rounded-xl border px-4 py-2 font-bold">{busy === game.id ? "建立中…" : "👥 邀請創作者"}</button>}</div></article>)}</div>}
  </div></main>;
}
