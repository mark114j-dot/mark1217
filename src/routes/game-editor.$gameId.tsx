import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getCollaboratorGame, updateCollaboratorGame } from "@/lib/creatorCollaboration.functions";

export const Route = createFileRoute("/game-editor/$gameId")({ component: GameEditorPage });

function GameEditorPage() {
  const { gameId } = Route.useParams();
  const { user, loading } = useAuth();
  const getFn = useServerFn(getCollaboratorGame);
  const updateFn = useServerFn(updateCollaboratorGame);
  const navigate = useNavigate();
  const [game, setGame] = useState<{ id: string; slug: string; name: string; html_content: string; version: number } | null>(null);
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!user) return;
    getFn({ data: { game_id: gameId } }).then((result: any) => { setGame(result); setHtml(result.html_content ?? ""); }).catch((e) => toast.error(e instanceof Error ? e.message : "無法載入遊戲"));
  }, [user, gameId]);

  async function save() {
    if (busy || !game) return;
    if (!html.trim()) return toast.error("請輸入遊戲程式碼");
    if (new Blob([html]).size > 500 * 1024) return toast.error("遊戲程式碼不能超過 500 KB");
    setBusy(true);
    try {
      await updateFn({ data: { game_id: game.id, html_content: html } });
      setGame((g) => g ? { ...g, html_content: html, version: g.version + 1 } : g);
      toast.success("遊戲已更新");
    } catch (e) { toast.error(e instanceof Error ? e.message : "儲存失敗"); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="min-h-screen grid place-items-center">讀取中…</main>;
  if (!user) return <main className="min-h-screen grid place-items-center p-6"><Link to="/login" className="rounded-xl border px-5 py-3 font-bold">請先登入</Link></main>;

  return <main className="min-h-screen bg-background p-4 md:p-8"><div className="mx-auto max-w-6xl space-y-5">
    <div className="flex items-center gap-3 flex-wrap"><Link to="/my-games" className="rounded-xl border px-3 py-2 font-bold">← 我的遊戲</Link><h1 className="text-2xl md:text-4xl font-black">✏️ {game?.name ?? "遊戲編輯器"}</h1>{game && <span className="rounded-full bg-muted px-3 py-1 text-sm font-bold">v{game.version}</span>}</div>
    {!game ? <div className="rounded-2xl border p-8 text-center">載入遊戲中…</div> : <>
      <div className="rounded-2xl border bg-primary/10 p-4 text-sm"><b>共同創作編輯器</b><span className="ml-2">你可以直接修改 HTML。儲存後所有玩家看到的遊戲內容會更新。</span></div>
      <textarea value={html} onChange={(e) => setHtml(e.target.value)} spellCheck={false} className="min-h-[520px] w-full rounded-2xl border bg-card p-4 font-mono text-sm" />
      <div className="flex flex-wrap gap-3"><button onClick={() => setPreview((v) => !v)} className="rounded-xl border px-5 py-3 font-bold">{preview ? "關閉預覽" : "▶ 預覽"}</button><button onClick={save} disabled={busy} className="rounded-xl border bg-primary px-6 py-3 font-black text-primary-foreground disabled:opacity-50">{busy ? "儲存中…" : "💾 儲存並更新遊戲"}</button><button onClick={() => navigate({ to: "/play/$slug", params: { slug: game.slug } })} className="rounded-xl border px-5 py-3 font-bold">▶ 開啟遊戲</button></div>
      {preview && <div className="rounded-2xl border bg-card p-3"><div className="px-2 pb-2 font-black">預覽</div><iframe title="遊戲預覽" srcDoc={html} sandbox="allow-scripts allow-pointer-lock" className="h-[560px] w-full rounded-xl border bg-white" /></div>}
    </>}
  </div></main>;
}
