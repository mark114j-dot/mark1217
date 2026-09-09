import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { checkAdmin } from "@/lib/studio.functions";
import {
  aiPropose, aiApply, aiReject, aiRevert, aiListChanges,
  type AiChange, type AiOp,
} from "@/lib/adminAi.functions";

export const Route = createFileRoute("/admin/ai")({
  component: AdminAi,
  head: () => ({
    meta: [
      { title: "AI 後台助手 — 管理員專用" },
      { name: "description", content: "以自然語言調整平台的遊戲內容與網站外觀，每項變更都需要管理員確認，並可在 7 天內一鍵回復。" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "AI 後台助手 — 管理員專用" },
      { property: "og:description", content: "以自然語言調整遊戲內容與網站外觀，變更需確認並可回復。" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Msg = { role: "user" | "assistant"; content: string };

function opLabel(op: AiOp) {
  switch (op.type) {
    case "game.update": return `✏️ 修改遊戲「${op.slug}」：${Object.entries(op.fields).map(([k, v]) => `${k} → ${String(v)}`).join("；")}`;
    case "game.status": return `📦 遊戲「${op.slug}」狀態改為 ${op.status}`;
    case "game.delete": return `🗑 刪除遊戲「${op.slug}」`;
    case "theme.set": return `🎨 外觀：${Object.entries(op.vars).map(([k, v]) => `${k} = ${v}`).join("；")}`;
  }
}

function AdminAi() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const check = useServerFn(checkAdmin);
  useEffect(() => {
    if (loading) return;
    if (!user) { setIsAdmin(false); return; }
    check().then((r) => setIsAdmin(r.isAdmin)).catch(() => setIsAdmin(false));
  }, [user, loading]);

  const propose = useServerFn(aiPropose);
  const apply = useServerFn(aiApply);
  const reject = useServerFn(aiReject);
  const revert = useServerFn(aiRevert);
  const listChanges = useServerFn(aiListChanges);

  const [msgs, setMsgs] = useState<Msg[]>([{
    role: "assistant",
    content: "嗨，我是你的後台 AI 助手。告訴我想調整什麼，例如「把貪食蛇的說明寫得更清楚」或「網站主色換成青綠色」。我會先提出變更，等你按確認才會生效。",
  }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ id: string; summary: string; ops: AiOp[] } | null>(null);
  const [history, setHistory] = useState<AiChange[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function refreshHistory() {
    try { setHistory(await listChanges()); } catch { /* ignore */ }
  }
  useEffect(() => { if (isAdmin) refreshHistory(); }, [isAdmin]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [msgs, pending]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setBusy(true);
    try {
      const r = await propose({ data: { message: text, history: next.slice(-10) } });
      setMsgs((m) => [...m, { role: "assistant", content: r.reply || "（沒有回覆）" }]);
      if (r.changeId && r.ops.length) setPending({ id: r.changeId, summary: r.summary, ops: r.ops as AiOp[] });
      else setPending(null);
    } catch (e: any) {
      toast.error(String(e?.message ?? e));
    } finally { setBusy(false); }
  }

  async function confirmPending() {
    if (!pending) return;
    setBusy(true);
    try {
      await apply({ data: { id: pending.id } });
      toast.success("已套用變更");
      setMsgs((m) => [...m, { role: "assistant", content: "✅ 變更已套用，需要的話可以在右側「變更紀錄」回復。" }]);
      setPending(null);
      refreshHistory();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  async function cancelPending() {
    if (!pending) return;
    try { await reject({ data: { id: pending.id } }); } catch { /* ignore */ }
    setPending(null);
    setMsgs((m) => [...m, { role: "assistant", content: "好的，這次變更已取消。" }]);
  }

  async function doRevert(id: string) {
    setBusy(true);
    try {
      await revert({ data: { id } });
      toast.success("已回復到變更前的版本");
      refreshHistory();
    } catch (e: any) { toast.error(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  if (loading || isAdmin === null) {
    return <main className="min-h-screen grid place-items-center">讀取中…</main>;
  }
  if (!isAdmin) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="border-brutal shadow-brutal rounded-2xl bg-card p-6 text-center">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="font-display font-bold text-xl mb-2">僅限管理員</h1>
          <Link to="/" className="underline">回首頁</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/" className="border-brutal shadow-brutal-sm rounded-lg px-3 py-1.5 bg-card">← 回首頁</Link>
          <Link to="/admin/manual" className="border-brutal shadow-brutal-sm rounded-lg px-3 py-1.5 bg-primary text-primary-foreground font-bold">🎮 手動新增遊戲</Link>
          <h1 className="font-display text-2xl font-bold">🤖 AI 後台助手</h1>
        </div>

        <div className="border-brutal shadow-brutal rounded-2xl bg-card p-4">
          <div className="font-bold">🎮 不用 AI，也可以自己新增遊戲</div>
          <p className="text-sm text-muted-foreground mt-1">你可以自己輸入遊戲名稱、網址代稱、介紹、分類、封面、HTML 遊戲程式或外部遊戲網址，再建立成草稿。</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <section className="border-brutal shadow-brutal rounded-2xl bg-card flex flex-col min-h-0 h-[70vh]">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-right" : ""}>
                  <div className={`inline-block max-w-[85%] text-left rounded-2xl px-3 py-2 whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{m.content}</div>
                </div>
              ))}

              {pending && (
                <div className="border-brutal rounded-2xl bg-background p-3 space-y-2">
                  <div className="font-bold">請確認以下變更</div>
                  {pending.summary && <div className="text-sm text-muted-foreground">{pending.summary}</div>}
                  <ul className="text-sm space-y-1">
                    {pending.ops.map((op, i) => <li key={i}>• {opLabel(op)}</li>)}
                  </ul>
                  <div className="flex gap-2 pt-1">
                    <button onClick={confirmPending} disabled={busy} className="border-brutal shadow-brutal-sm rounded-lg px-3 py-1.5 bg-primary text-primary-foreground font-bold">✅ 確認套用</button>
                    <button onClick={cancelPending} disabled={busy} className="border-brutal shadow-brutal-sm rounded-lg px-3 py-1.5 bg-card">✖ 取消</button>
                  </div>
                </div>
              )}
              {busy && <div className="text-sm text-muted-foreground">AI 思考中…</div>}
            </div>

            <div className="border-t p-3 flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="想改什麼？例如：把主色換成青綠色" aria-label="輸入給 AI 的指令" className="flex-1 min-w-0 border-brutal rounded-lg px-3 py-2 bg-background" />
              <button onClick={send} disabled={busy} className="border-brutal shadow-brutal-sm rounded-lg px-4 py-2 bg-primary text-primary-foreground font-bold">送出</button>
            </div>
          </section>

          <aside className="border-brutal shadow-brutal rounded-2xl bg-card p-4 space-y-3 h-[70vh] overflow-y-auto">
            <div className="font-display font-bold text-lg">🕘 變更紀錄（保留 7 天）</div>
            {history.length === 0 && <div className="text-sm text-muted-foreground">還沒有任何變更。</div>}
            {history.map((h) => (
              <div key={h.id} className="border-brutal rounded-xl p-3 space-y-2 bg-background">
                <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("zh-TW")}</div>
                <div className="text-sm font-medium">{h.summary || "（未命名變更）"}</div>
                <ul className="text-xs text-muted-foreground space-y-0.5">{(h.ops ?? []).map((op, i) => <li key={i}>• {opLabel(op)}</li>)}</ul>
                <div className="flex items-center gap-2">
                  <span className="text-xs rounded-full px-2 py-0.5 bg-muted">{h.status === "applied" ? "已套用" : h.status === "reverted" ? "已回復" : h.status === "rejected" ? "已取消" : "待確認"}</span>
                  {h.status === "applied" && <button onClick={() => doRevert(h.id)} disabled={busy} className="border-brutal rounded-lg px-2 py-1 text-xs bg-card">↩ 回復此版本</button>}
                </div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </main>
  );
}
