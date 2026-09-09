import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { createPlayerGame } from "@/lib/playerGame.functions";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/studio/manual")({
  component: ManualGameStudio,
  head: () => ({
    meta: [
      { title: "手動製作遊戲 — 不用 AI｜畫聊 Doodle" },
      { name: "description", content: "手動製作遊戲，完全自主控制遊戲邏輯、規則和設計。無需 AI，直接編寫 HTML/CSS/JavaScript 遊戲程式碼。" },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

interface GameConfig {
  name: string;
  category: string;
  description: string;
  playerMode: string;
  maxPlayers: number;
  rules: string;
  winCondition: string;
  loseCondition: string;
  htmlContent: string;
}

function ManualGameStudio() {
  const { user, loading } = useAuth();
  const create = useServerFn(createPlayerGame);
  const navigate = useNavigate();
  const [step, setStep] = useState<"config" | "code" | "preview">("config");
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState<GameConfig>({
    name: "",
    category: "puzzle",
    description: "",
    playerMode: "single",
    maxPlayers: 1,
    rules: "",
    winCondition: "",
    loseCondition: "",
    htmlContent: "",
  });

  const CATEGORIES = [
    { value: "puzzle", label: "益智解謎" },
    { value: "action", label: "動作冒險" },
    { value: "strategy", label: "策略棋盤" },
    { value: "card", label: "卡牌遊戲" },
    { value: "party", label: "歡樂派對" },
    { value: "math", label: "數學計算" },
    { value: "logic", label: "邏輯推理" },
    { value: "speed", label: "反應速度" },
  ];

  const PLAYER_MODES = [
    { value: "single", label: "單人遊戲" },
    { value: "multiplayer", label: "多人遊戲" },
    { value: "cooperative", label: "合作遊戲" },
  ];

  function updateConfig(updates: Partial<GameConfig>) {
    setConfig((prev) => ({ ...prev, ...updates }));
  }

  async function publishGame() {
    if (!config.name.trim()) return toast.error("請輸入遊戲名稱");
    if (!config.htmlContent.trim()) return toast.error("請輸入遊戲程式碼");
    if (new Blob([config.htmlContent]).size > 500 * 1024) return toast.error("程式碼不能超過 500 KB");

    setBusy(true);
    try {
      // 組合遊戲描述（包含規則和條件）
      const fullDescription = `${config.description}\n\n【規則】\n${config.rules}\n\n【勝利條件】\n${config.winCondition}\n\n【失敗條件】\n${config.loseCondition}`;

      const game = await create({
        data: {
          name: config.name.trim(),
          html_content: config.htmlContent,
          category: config.category,
          instructions: fullDescription,
        },
      });

      toast.success(`「${game.name}」已發布！`);
      await navigate({ to: "/play/$slug", params: { slug: game.slug } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "發布失敗");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="min-h-screen grid place-items-center">讀取中…</main>;
  if (!user)
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="border-brutal shadow-brutal rounded-2xl bg-card p-6 text-center space-y-3">
          <div className="text-5xl">🔒</div>
          <h1 className="text-2xl font-black">請先登入</h1>
          <p className="text-sm text-muted-foreground">登入後就能製作屬於你的小遊戲。</p>
          <Link to="/login" className="inline-block border-brutal shadow-brutal rounded-xl px-5 py-3 bg-primary text-primary-foreground font-bold">
            前往登入
          </Link>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* 標題 */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/games" className="border-brutal shadow-brutal-sm rounded-lg px-3 py-2 bg-card inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            遊戲大廳
          </Link>
          <h1 className="text-3xl md:text-4xl font-black">🎮 手動製作遊戲工作室</h1>
        </div>

        {/* 進度指示 */}
        <div className="flex gap-4 items-center">
          {["config", "code", "preview"].map((s, i) => (
            <div key={s} className="flex items-center gap-4">
              <button
                onClick={() => setStep(s as any)}
                className={`rounded-full w-10 h-10 flex items-center justify-center font-bold ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted border-2 border-muted-foreground/20 cursor-pointer hover:border-muted-foreground/50"
                }`}
              >
                {i + 1}
              </button>
              {i < 2 && <div className="w-8 h-1 bg-muted rounded" />}
            </div>
          ))}
        </div>

        <div className="border-brutal shadow-brutal rounded-3xl bg-card p-6 md:p-8 space-y-6">
          {/* 步驟 1: 遊戲配置 */}
          {step === "config" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black mb-4">📋 基本資訊</h2>

                {/* 遊戲名稱 */}
                <label className="block space-y-2 mb-4">
                  <span className="font-bold">遊戲名稱 *</span>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => updateConfig({ name: e.target.value })}
                    maxLength={80}
                    placeholder="例如：2048 合併挑戰"
                    className="w-full border-brutal rounded-xl px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </label>

                {/* 遊戲描述 */}
                <label className="block space-y-2 mb-4">
                  <span className="font-bold">遊戲描述</span>
                  <textarea
                    value={config.description}
                    onChange={(e) => updateConfig({ description: e.target.value })}
                    placeholder="用一句話描述你的遊戲..."
                    className="w-full border-brutal rounded-xl px-4 py-3 bg-background min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </label>

                {/* 分類和模式 */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <label className="block space-y-2">
                    <span className="font-bold">分類 *</span>
                    <select
                      value={config.category}
                      onChange={(e) => updateConfig({ category: e.target.value })}
                      className="w-full border-brutal rounded-xl px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="font-bold">遊戲模式 *</span>
                    <select
                      value={config.playerMode}
                      onChange={(e) => updateConfig({ playerMode: e.target.value })}
                      className="w-full border-brutal rounded-xl px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {PLAYER_MODES.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* 最多玩家 */}
                {config.playerMode !== "single" && (
                  <label className="block space-y-2 mb-4">
                    <span className="font-bold">最多玩家數</span>
                    <input
                      type="number"
                      value={config.maxPlayers}
                      onChange={(e) => updateConfig({ maxPlayers: Math.max(1, parseInt(e.target.value)) })}
                      min="1"
                      max="100"
                      className="w-full border-brutal rounded-xl px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>
                )}
              </div>

              {/* 遊戲規則 */}
              <div className="border-t-2 border-muted pt-6">
                <h2 className="text-2xl font-black mb-4">📖 遊戲規則</h2>

                <label className="block space-y-2 mb-4">
                  <span className="font-bold">遊戲規則 *</span>
                  <textarea
                    value={config.rules}
                    onChange={(e) => updateConfig({ rules: e.target.value })}
                    placeholder="詳細說明遊戲如何進行，操作方式，玩法等..."
                    className="w-full border-brutal rounded-xl px-4 py-3 bg-background min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </label>

                <label className="block space-y-2 mb-4">
                  <span className="font-bold">勝利條件 *</span>
                  <textarea
                    value={config.winCondition}
                    onChange={(e) => updateConfig({ winCondition: e.target.value })}
                    placeholder="玩家如何贏得遊戲？"
                    className="w-full border-brutal rounded-xl px-4 py-3 bg-background min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </label>

                <label className="block space-y-2 mb-4">
                  <span className="font-bold">失敗條件 *</span>
                  <textarea
                    value={config.loseCondition}
                    onChange={(e) => updateConfig({ loseCondition: e.target.value })}
                    placeholder="遊戲何時結束或玩家失敗？"
                    className="w-full border-brutal rounded-xl px-4 py-3 bg-background min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </label>
              </div>

              {/* 下一步按鈕 */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep("code")}
                  disabled={!config.name.trim()}
                  className="flex-1 border-brutal shadow-brutal rounded-xl px-6 py-4 bg-primary text-primary-foreground font-bold text-lg disabled:opacity-50"
                >
                  下一步：編寫程式碼 →
                </button>
              </div>
            </div>
          )}

          {/* 步驟 2: 遊戲程式碼 */}
          {step === "code" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black">💻 遊戲程式碼</h2>

              <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>貼上完整的 HTML/CSS/JavaScript 遊戲程式碼。</strong> 支援的技術：
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>HTML5 Canvas / SVG</li>
                  <li>Vanilla JavaScript</li>
                  <li>CSS3 動畫</li>
                  <li>Web APIs (Geolocation, Audio, Storage 等)</li>
                  <li>限制：最多 500 KB</li>
                </ul>
              </div>

              <label className="block space-y-2">
                <span className="font-bold">貼上 HTML 遊戲程式碼 *</span>
                <textarea
                  value={config.htmlContent}
                  onChange={(e) => updateConfig({ htmlContent: e.target.value })}
                  spellCheck={false}
                  placeholder="<html>
<head>
  <title>我的遊戲</title>
  <style>
    /* 你的 CSS */
  </style>
</head>
<body>
  <!-- 你的 HTML -->
  <script>
    // 你的 JavaScript 遊戲邏輯
  </script>
</body>
</html>"
                  className="w-full border-brutal rounded-xl px-4 py-3 bg-background min-h-[300px] focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
                />
              </label>

              <p className="text-xs text-muted-foreground">
                程式碼大小：{(new Blob([config.htmlContent]).size / 1024).toFixed(2)} KB / 500 KB
              </p>

              <div className="flex gap-3 pt-4 flex-wrap">
                <button
                  onClick={() => setStep("config")}
                  className="border-brutal rounded-xl px-6 py-4 bg-background font-bold text-lg hover:bg-muted"
                >
                  ← 上一步
                </button>
                <button
                  onClick={() => setStep("preview")}
                  disabled={!config.htmlContent.trim()}
                  className="flex-1 border-brutal shadow-brutal rounded-xl px-6 py-4 bg-primary text-primary-foreground font-bold text-lg disabled:opacity-50"
                >
                  下一步：預覽 →
                </button>
              </div>
            </div>
          )}

          {/* 步驟 3: 預覽和發布 */}
          {step === "preview" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black">👀 預覽與發布</h2>

              <div className="border-2 border-muted rounded-xl overflow-hidden">
                <iframe
                  title="遊戲預覽"
                  srcDoc={config.htmlContent}
                  className="w-full h-96 md:h-[500px] bg-white"
                />
              </div>

              <div className="bg-yellow-100/50 border-l-4 border-yellow-500 p-4 rounded text-sm">
                <p className="font-bold">💡 檢查清單：</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>遊戲能正常運行嗎？</li>
                  <li>所有交互按鈕都有效嗎？</li>
                  <li>遊戲規則是否清楚？</li>
                  <li>勝利/失敗條件是否明確？</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold">📝 遊戲摘要：</h3>
                <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                  <p>
                    <strong>名稱：</strong> {config.name}
                  </p>
                  <p>
                    <strong>分類：</strong> {CATEGORIES.find((c) => c.value === config.category)?.label}
                  </p>
                  <p>
                    <strong>模式：</strong> {PLAYER_MODES.find((m) => m.value === config.playerMode)?.label}
                  </p>
                  <p>
                    <strong>描述：</strong> {config.description || "（未填寫）"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 flex-wrap">
                <button
                  onClick={() => setStep("code")}
                  className="border-brutal rounded-xl px-6 py-4 bg-background font-bold text-lg hover:bg-muted"
                >
                  ← 編輯程式碼
                </button>
                <button
                  onClick={publishGame}
                  disabled={busy}
                  className="flex-1 border-brutal shadow-brutal rounded-xl px-6 py-4 bg-primary text-primary-foreground font-black text-lg disabled:opacity-50"
                >
                  {busy ? "發布中..." : "🚀 發布遊戲"}
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                發布後你的遊戲將進入遊戲大廳，其他玩家可以發現並遊玩。
              </p>
            </div>
          )}
        </div>

        {/* 幫助提示 */}
        <div className="border-brutal rounded-2xl bg-blue-100/50 p-6">
          <h3 className="font-black mb-3">💡 提示與資源</h3>
          <ul className="space-y-2 text-sm">
            <li>
              📚 <strong>HTML5 遊戲開發入門：</strong> 查看
              <a
                href="https://developer.mozilla.org/en-US/docs/Games"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600 hover:text-blue-800 ml-1"
              >
                MDN 遊戲開發文檔
              </a>
            </li>
            <li>
              🎮 <strong>Canvas API：</strong> 用於繪製 2D 圖形和製作遊戲
            </li>
            <li>
              🎵 <strong>Web Audio API：</strong> 為遊戲添加音效和背景音樂
            </li>
            <li>
              💾 <strong>localStorage：</strong> 保存遊戲進度和用戶數據
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
