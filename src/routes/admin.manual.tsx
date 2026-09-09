import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "soner";
import { useAuth } from "@/lib/auth";
import { checkAdmin } from "@/lib/studio.functions";
import { createManualGame } from "@/lib/manualGame.functions";

export const Route = createFileRoute("/admin/manual")({ component: ManualGamePage });

function ManualGamePage() {
  const { user, loading } = useAuth();
  const check = useServerFn(checkAdmin);
  const create = useServerFn(createManualGame);
  const navigate = useNavigate();
  
  // 狀態管理
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);  // 管理員權限檢查
  const [name, setName] = useState("");                          // 遊戲名稱
  const [htmlContent, setHtmlContent] = useState("");            // HTML 遊戲程式碼
  const [busy, setBusy] = useState(false);                       // 提交中狀態

  // 檢查使用者是否為管理員
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    check().then((r) => setIsAdmin(r.isAdmin)).catch(() => setIsAdmin(false));
  }, [user, loading]);

  // 提交表單：建立遊戲
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      // 呼叫伺服器函數建立遊戲
      const game = await create({ data: { name, html_content: htmlContent } });
      toast.success(`「${game.name}」已直接發布！`);
      // 發布成功後導向遊戲頁面
      await navigate({ to: "/play/$slug", params: { slug: game.slug } });
    } catch (error: any) {
      toast.error(String(error?.message ?? error));
    } finally {
      setBusy(false);
    }
  }

  // 讀取中狀態
  if (loading || isAdmin === null) {
    return <main className="min-h-screen grid place-items-center">讀取中…</main>;
  }

  // 無權限訪問
  if (!isAdmin) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="border-brutal rounded-2xl bg-card p-6 text-center">
          <div className="text-4xl">🔒</div>
          <h1 className="font-bold text-xl mt-3">只有管理員可以訪問</h1>
          <p className="text-sm text-muted-foreground mt-2">你沒有權限使用此功能。</p>
          <Link to="/" className="border-brutal shadow-brutal-sm rounded-lg px-3 py-2 bg-card mt-4 inline-block">
            ← 回首頁
          </Link>
        </div>
      </main>
    );
  }

  // 主要表單
  return (
    <main className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* 頁面標題與導航 */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/" className="border-brutal shadow-brutal-sm rounded-lg px-3 py-2 bg-card">
            ← 回首頁
          </Link>
          <Link to="/admin/ai" className="border-brutal shadow-brutal-sm rounded-lg px-3 py-2 bg-card">
            🤖 AI 後台
          </Link>
          <h1 className="font-display text-2xl md:text-3xl font-bold">🎮 直接發布遊戲</h1>
        </div>

        {/* 説明區域 */}
        <div className="border-brutal shadow-brutal rounded-2xl bg-card p-4 md:p-6">
          <p className="font-bold">✨ 管理員專用功能</p>
          <p className="text-sm text-muted-foreground mt-1">
            不用 AI 點數，也能發布。只需要填遊戲名稱，再貼上完整 HTML 遊戲程式碼。
            系統會自動建立遊戲網址並直接發布。
          </p>
        </div>

        {/* 遊戲資訊表單 */}
        <form onSubmit={submit} className="space-y-4">
          <section className="border-brutal shadow-brutal rounded-2xl bg-card p-4 md:p-6 space-y-4">
            {/* 遊戲名稱輸入欄 */}
            <label className="block space-y-1">
              <span className="font-bold">🎯 遊戲名稱 *</span>
              <span className="text-xs text-muted-foreground">
                這是遊戲的顯示名稱。系統會自動生成網址。
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：數字消除、配對大師、快速反應…"
                required
                className="w-full border-brutal rounded-xl px-3 py-3 bg-background"
              />
            </label>

            {/* 遊戲程式碼輸入欄 */}
            <label className="block space-y-1">
              <span className="font-bold">💻 遊戲程式碼 *</span>
              <span className="text-xs text-muted-foreground">
                貼上完整的 HTML、CSS、JavaScript 遊戲程式碼（最大 500KB）
              </span>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder={`把完整的 HTML 遊戲程式碼貼在這裡…

例如：
<!DOCTYPE html>
<html>
<head>
  <title>我的遊戲</title>
  <style>
    body { margin: 0; overflow: hidden; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script>
    // 你的遊戲代碼
  </script>
</body>
</html>`}
                required
                className="w-full min-h-[420px] border-brutal rounded-xl px-3 py-3 bg-background font-mono text-sm"
              />
            </label>
          </section>

          {/* 提交按鈕區域 */}
          <section className="border-brutal shadow-brutal rounded-2xl bg-card p-4 md:p-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <b>🚀 直接發布</b>
              <p className="text-sm text-muted-foreground">
                不建立草稿、不需要 AI 點數。立即發布到線上。
              </p>
            </div>
            <button
              disabled={busy || !name || !htmlContent}
              className="border-brutal shadow-brutal rounded-xl px-6 py-3 bg-primary text-primary-foreground font-bold disabled:opacity-50 hover:shadow-lg transition-all"
            >
              {busy ? "🔄 發布中…" : "🚀 直接發布遊戲"}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}
