import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { checkAdmin } from "@/lib/studio.functions";
import { createManualGame } from "@/lib/manualGame.functions";

export const Route = createFileRoute("/admin/manual")({ component: ManualGamePage });

function ManualGamePage() {
  const { user, loading } = useAuth();
  const check = useServerFn(checkAdmin);
  const create = useServerFn(createManualGame);
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    check().then((r) => setIsAdmin(r.isAdmin)).catch(() => setIsAdmin(false));
  }, [user, loading]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const game = await create({ data: { name, html_content: htmlContent } });
      toast.success(`「${game.name}」已直接發布！`);
      await navigate({ to: "/play/$slug", params: { slug: game.slug } });
    } catch (error: any) {
      toast.error(String(error?.message ?? error));
    } finally {
      setBusy(false);
    }
  }

  if (loading || isAdmin === null) {
    return <main className="min-h-screen grid place-items-center">讀取中…</main>;
  }

  if (!isAdmin) {
    return <main className="min-h-screen grid place-items-center p-6"><div className="border-brutal rounded-2xl bg-card p-6 text-center"><div className="text-4xl">🔒</div><h1 className="font-bold text-xl my-2">僅限管理員</h1><Link to="/" className="underline">回首頁</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/" className="border-brutal shadow-brutal-sm rounded-lg px-3 py-2 bg-card">← 回首頁</Link>
          <Link to="/admin/ai" className="border-brutal shadow-brutal-sm rounded-lg px-3 py-2 bg-card">🤖 AI 後台</Link>
          <h1 className="font-display text-2xl md:text-3xl font-bold">🎮 直接發布遊戲</h1>
        </div>

        <div className="border-brutal shadow-brutal rounded-2xl bg-card p-4 md:p-6">
          <p className="font-bold">不用 AI 點數，也能發布。</p>
          <p className="text-sm text-muted-foreground mt-1">只需要填遊戲名稱，再貼上完整 HTML 遊戲程式碼。系統會自動建立遊戲網址並直接發布。</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <section className="border-brutal shadow-brutal rounded-2xl bg-card p-4 md:p-6 space-y-4">
            <label className="block space-y-1">
              <span className="font-bold">遊戲名稱 *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：數字消除" required className="w-full border-brutal rounded-xl px-3 py-3 bg-background" />
            </label>

            <label className="block space-y-1">
              <span className="font-bold">遊戲程式碼 *</span>
              <textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} placeholder="把完整的 HTML 遊戲程式碼貼在這裡…" required className="w-full min-h-[420px] border-brutal rounded-xl p-3 bg-background font-mono text-sm" spellCheck={false} />
            </label>
          </section>

          <section className="border-brutal shadow-brutal rounded-2xl bg-card p-4 md:p-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <b>🚀 直接發布</b>
              <p className="text-sm text-muted-foreground">不建立草稿、不需要 AI 點數。</p>
            </div>
            <button disabled={busy} className="border-brutal shadow-brutal rounded-xl px-6 py-3 bg-primary text-primary-foreground font-bold disabled:opacity-50">
              {busy ? "發布中…" : "🚀 直接發布遊戲"}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}
