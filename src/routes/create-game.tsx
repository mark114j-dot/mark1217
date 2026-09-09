import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { createPlayerGame } from "@/lib/playerGame.functions";

export const Route = createFileRoute("/create-game")({ component: CreateGamePage });

function CreateGamePage() {
  const { user, loading } = useAuth();
  const create = useServerFn(createPlayerGame);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim() || !html.trim()) return toast.error("請輸入遊戲名稱和程式碼");
    setBusy(true);
    try {
      const game = await create({ data: { name, html_content: html } });
      toast.success(`「${game.name}」已發布！`);
      await navigate({ to: "/play/$slug", params: { slug: game.slug } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "發布失敗");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="min-h-screen grid place-items-center">讀取中…</main>;
  if (!user) return <main className="min-h-screen grid place-items-center p-6"><div className="border-brutal shadow-brutal rounded-2xl bg-card p-6 text-center space-y-3"><div className="text-5xl">🔒</div><h1 className="text-2xl font-black">請先登入</h1><p className="text-sm text-muted-foreground">登入後就能製作並發布自己的小遊戲。</p><Link to="/login" className="inline-block border-brutal shadow-brutal rounded-xl px-5 py-3 bg-primary text-primary-foreground font-bold">前往登入</Link></div></main>;

  return <main className="min-h-screen bg-background p-4 md:p-8"><div className="mx-auto max-w-4xl space-y-5">
    <div className="flex items-center gap-3"><Link to="/games" className="border-brutal shadow-brutal-sm rounded-lg px-3 py-2 bg-card">← 遊戲大廳</Link><h1 className="text-2xl md:text-4xl font-black">🎮 製作自己的遊戲</h1></div>
    <div className="rounded-2xl border bg-primary/10 p-4"><b>不用 AI 點數。</b>只要輸入遊戲名稱＋完整 HTML 程式碼，就能直接發布到遊戲大廳。</div>
    <form onSubmit={submit} className="space-y-4">
      <section className="border-brutal shadow-brutal rounded-2xl bg-card p-4 md:p-6 space-y-4">
        <label className="block space-y-1"><span className="font-bold">遊戲名稱</span><input value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="例如：我的超級迷宮" className="w-full border-brutal rounded-xl px-4 py-3 bg-background" /></label>
        <label className="block space-y-1"><span className="font-bold">完整 HTML 遊戲程式碼</span><textarea value={html} onChange={e => setHtml(e.target.value)} spellCheck={false} placeholder={'<!doctype html>\n<html>\n  ...\n</html>'} className="w-full min-h-[420px] border-brutal rounded-xl p-4 bg-background font-mono text-sm" /></label>
        <p className="text-xs text-muted-foreground">上限 500 KB。發布後會出現在「全部」遊戲中，網址會自動產生。</p>
      </section>
      <button disabled={busy} className="w-full border-brutal shadow-brutal rounded-2xl px-6 py-4 bg-primary text-primary-foreground font-black text-lg disabled:opacity-50">{busy ? "發布中…" : "🚀 直接發布遊戲"}</button>
    </form>
  </div></main>;
}
