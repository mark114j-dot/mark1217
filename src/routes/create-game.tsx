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
  const [preview, setPreview] = useState(false);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) return toast.error("請輸入遊戲名稱");
    if (!html.trim()) return toast.error("請貼上 HTML 遊戲程式碼");
    if (new Blob([html]).size > 500 * 1024) return toast.error("遊戲程式碼不能超過 500 KB");
    setBusy(true);
    try {
      const game = await create({ data: { name: name.trim(), html_content: html } });
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

  return <main className="min-h-screen bg-background p-4 md:p-8"><div className="mx-auto max-w-5xl space-y-5">
    <div className="flex items-center gap-3 flex-wrap"><Link to="/games" className="border-brutal shadow-brutal-sm rounded-lg px-3 py-2 bg-card">← 遊戲大廳</Link><h1 className="text-2xl md:text-4xl font-black">🎮 製作遊戲</h1></div>
    <div className="rounded-2xl border bg-primary/10 p-4"><b>免費玩家製作區</b><span className="ml-2">輸入名稱、貼上自己做好的 HTML 遊戲，按發布就會自動建立遊戲。</span></div>
    <form onSubmit={publish} className="space-y-4">
      <section className="border-brutal shadow-brutal rounded-2xl bg-card p-4 md:p-6 space-y-4">
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
          <label className="block space-y-1"><span className="font-bold">1. 遊戲名稱</span><input value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="例如：我的超級迷宮" className="w-full border-brutal rounded-xl px-4 py-3 bg-background" /></label>
          <button type="button" onClick={() => setPreview(v => !v)} className="border-brutal rounded-xl px-4 py-3 font-bold bg-background">{preview ? "關閉預覽" : "▶ 預覽遊戲"}</button>
        </div>
        <label className="block space-y-1"><span className="font-bold">2. 貼上自己做好的 HTML 遊戲程式</span><textarea value={html} onChange={e => setHtml(e.target.value)} spellCheck={false} placeholder={'<!doctype html>\n<html>\n  <head>...</head>\n  <body>你的遊戲</body>\n</html>'} className="w-full min-h-[420px] border-brutal rounded-xl p-4 bg-background font-mono text-sm" /></label>
        <p className="text-xs text-muted-foreground">最多 500 KB。程式會以遊戲頁面載入，不會直接執行在平台主頁。</p>
      </section>
      {preview && html.trim() && <section className="border-brutal shadow-brutal rounded-2xl bg-card p-3"><div className="font-black px-2 pb-2">遊戲預覽</div><iframe title="遊戲預覽" srcDoc={html} sandbox="allow-scripts allow-pointer-lock" className="w-full h-[520px] rounded-xl border bg-white" /></section>}
      <button disabled={busy} className="w-full border-brutal shadow-brutal rounded-2xl px-6 py-4 bg-primary text-primary-foreground font-black text-lg disabled:opacity-50">{busy ? "發布中…" : "3. 🚀 發布遊戲"}</button>
    </form>
    <section className="grid md:grid-cols-3 gap-3 text-sm">
      <div className="border-brutal rounded-xl bg-card p-4"><b>4. 自動建立</b><p className="mt-1 text-muted-foreground">系統自動產生遊戲網址與遊戲資料。</p></div>
      <div className="border-brutal rounded-xl bg-card p-4"><b>5. 出現在平台</b><p className="mt-1 text-muted-foreground">發布後會進入遊戲大廳的遊戲列表。</p></div>
      <div className="border-brutal rounded-xl bg-card p-4"><b>6. 共同創作</b><p className="mt-1 text-muted-foreground">之後可邀請其他創作者一起修改這個遊戲。</p></div>
    </section>
  </div></main>;
}
