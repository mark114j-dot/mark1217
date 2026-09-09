import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { checkAdmin } from "@/lib/studio.functions";
import { createManualGame, type ManualGameInput } from "@/lib/manualGame.functions";

export const Route = createFileRoute("/admin/manual")({ component: ManualGamePage });

const initial: ManualGameInput = { name: "", slug: "", emoji: "🎮", description: "", category: "puzzle", cover_image_url: "", instructions: "", html_content: "", play_url: "", offline_ok: false, min_players: 1, max_players: 1 };

function ManualGamePage() {
  const { user, loading } = useAuth();
  const check = useServerFn(checkAdmin);
  const create = useServerFn(createManualGame);
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [form, setForm] = useState<ManualGameInput>(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { setIsAdmin(false); return; }
    check().then((r) => setIsAdmin(r.isAdmin)).catch(() => setIsAdmin(false));
  }, [user, loading]);

  const set = <K extends keyof ManualGameInput>(key: K, value: ManualGameInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const game = await create({ data: form });
      toast.success(`已建立「${game.name}」草稿`);
      await navigate({ to: "/games" });
    } catch (error: any) { toast.error(String(error?.message ?? error)); }
    finally { setBusy(false); }
  }

  if (loading || isAdmin === null) return <main className="min-h-screen grid place-items-center">讀取中…</main>;
  if (!isAdmin) return <main className="min-h-screen grid place-items-center p-6"><div className="border-brutal rounded-2xl bg-card p-6 text-center"><div className="text-4xl">🔒</div><h1 className="font-bold text-xl my-2">僅限管理員</h1><Link to="/" className="underline">回首頁</Link></div></main>;

  return <main className="min-h-screen bg-background p-4 md:p-6"><div className="max-w-4xl mx-auto space-y-4">
    <div className="flex items-center gap-3 flex-wrap"><Link to="/" className="border-brutal shadow-brutal-sm rounded-lg px-3 py-2 bg-card">← 回首頁</Link><Link to="/admin/ai" className="border-brutal shadow-brutal-sm rounded-lg px-3 py-2 bg-card">🤖 AI 後台</Link><h1 className="font-display text-2xl md:text-3xl font-bold">🎮 手動新增遊戲</h1></div>
    <form onSubmit={submit} className="space-y-4">
      <section className="border-brutal shadow-brutal rounded-2xl bg-card p-4 md:p-6 space-y-4"><h2 className="font-bold text-lg">① 基本資料</h2>
        <div className="grid md:grid-cols-[1fr_120px] gap-3"><Field label="遊戲名稱 *" value={form.name} onChange={(v) => set("name", v)} placeholder="例如：數字消除" /><Field label="Emoji" value={form.emoji} onChange={(v) => set("emoji", v)} placeholder="🎮" /></div>
        <Field label="網址代稱 *" value={form.slug} onChange={(v) => set("slug", v)} placeholder="例如：number-match" />
        <p className="text-xs text-muted-foreground">遊戲網址會是 /play/網址代稱。建議使用英數字和短橫線。</p>
        <Field label="簡介" value={form.description} onChange={(v) => set("description", v)} placeholder="簡短介紹遊戲玩法" multiline />
        <div className="grid md:grid-cols-2 gap-3"><Field label="分類" value={form.category} onChange={(v) => set("category", v)} placeholder="puzzle / board / logic" /><Field label="封面圖片網址" value={form.cover_image_url} onChange={(v) => set("cover_image_url", v)} placeholder="https://..." /></div>
        <Field label="遊戲說明" value={form.instructions} onChange={(v) => set("instructions", v)} placeholder="操作方式、勝利條件等" multiline />
      </section>
      <section className="border-brutal shadow-brutal rounded-2xl bg-card p-4 md:p-6 space-y-4"><h2 className="font-bold text-lg">② 遊戲內容</h2><div className="rounded-xl bg-muted p-3 text-sm">貼完整 HTML 遊戲，或填可以直接開啟的遊戲網址，至少填一項。</div>
        <label className="block space-y-1"><span className="font-medium">HTML 遊戲程式</span><textarea value={form.html_content} onChange={(e) => set("html_content", e.target.value)} placeholder="<!doctype html>..." className="w-full min-h-72 border-brutal rounded-xl p-3 bg-background font-mono text-sm" spellCheck={false} /></label>
        <Field label="或：外部遊戲網址" value={form.play_url} onChange={(v) => set("play_url", v)} placeholder="https://example.com/game" />
        <div className="grid md:grid-cols-2 gap-3"><Field label="最少玩家" type="number" value={String(form.min_players)} onChange={(v) => set("min_players", Math.max(1, Number(v) || 1))} /><Field label="最多玩家" type="number" value={String(form.max_players)} onChange={(v) => set("max_players", Math.max(1, Number(v) || 1))} /></div>
        <label className="flex items-center gap-3 border-brutal rounded-xl p-3 cursor-pointer"><input type="checkbox" checked={form.offline_ok} onChange={(e) => set("offline_ok", e.target.checked)} className="h-5 w-5" /><span><b>標記為支援離線</b><br /><small className="text-muted-foreground">只有遊戲真的不需要網路時才勾選。</small></span></label>
      </section>
      <section className="border-brutal shadow-brutal rounded-2xl bg-card p-4 md:p-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><div><b>儲存後會先建立「草稿」</b><p className="text-sm text-muted-foreground">不會直接公開。</p></div><button disabled={busy} className="border-brutal shadow-brutal rounded-xl px-6 py-3 bg-primary text-primary-foreground font-bold disabled:opacity-50">{busy ? "建立中…" : "🎮 建立遊戲草稿"}</button></section>
    </form>
  </div></main>;
}

function Field({ label, value, onChange, placeholder, multiline = false, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; type?: string }) {
  return <label className="block space-y-1"><span className="font-medium">{label}</span>{multiline ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full min-h-24 border-brutal rounded-xl px-3 py-2 bg-background" /> : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border-brutal rounded-xl px-3 py-2 bg-background" />}</label>;
}
