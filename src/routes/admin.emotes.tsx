import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { checkAdmin } from "@/lib/studio.functions";
import {
  listEmotesAdmin, upsertEmote, deleteEmote, adminAddGems,
  type ShopEmote,
} from "@/lib/emotes.functions";
import { getClientId } from "@/lib/game";

export const Route = createFileRoute("/admin/emotes")({
  component: AdminEmotesPage,
  head: () => ({ meta: [{ title: "GIF 表情管理 — 管理員" }] }),
});

type Draft = Partial<ShopEmote>;

function AdminEmotesPage() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const checkFn = useServerFn(checkAdmin);
  useEffect(() => {
    if (loading) return;
    if (!user) { setIsAdmin(false); return; }
    checkFn().then((r) => setIsAdmin(r.isAdmin)).catch(() => setIsAdmin(false));
  }, [user, loading]);

  if (loading || isAdmin === null) return <main className="min-h-screen grid place-items-center">讀取中…</main>;
  if (!isAdmin) return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="border-brutal shadow-brutal rounded-2xl bg-card p-6 text-center">
        <div className="text-5xl mb-2">🔒</div>
        <div className="font-display text-xl font-bold">僅限管理員</div>
        <a href="/" className="underline text-sm mt-2 inline-block">回首頁</a>
      </div>
    </main>
  );
  return <EmoteAdmin />;
}

function EmoteAdmin() {
  const listFn = useServerFn(listEmotesAdmin);
  const upsertFn = useServerFn(upsertEmote);
  const deleteFn = useServerFn(deleteEmote);
  const addGemsFn = useServerFn(adminAddGems);

  const [rows, setRows] = useState<ShopEmote[]>([]);
  const [draft, setDraft] = useState<Draft>({ display_mode: "fullscreen", gem_price: 10, active: true });
  const [editing, setEditing] = useState<string | null>(null);
  const [gemAmt, setGemAmt] = useState(100);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try { setRows(await listFn()); } catch (e: any) { toast.error(e.message); }
  }
  useEffect(() => { refresh(); }, []);

  async function save() {
    if (!draft.name?.trim() || !draft.gif_url?.trim()) { toast.error("名稱與 GIF URL 必填"); return; }
    setSaving(true);
    try {
      await upsertFn({ data: { ...draft, id: editing ?? undefined } as any });
      toast.success(editing ? "已更新" : "已新增");
      setDraft({ display_mode: "fullscreen", gem_price: 10, active: true });
      setEditing(null);
      refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("刪除這個 GIF 表情？")) return;
    try { await deleteFn({ data: { id } }); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }

  async function grantGems() {
    try {
      const r: any = await addGemsFn({ data: { clientId: getClientId(), amount: gemAmt } });
      toast.success(`寶石已入帳，目前 ${r.gems} 💎`);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <a href="/" className="border-brutal shadow-brutal-sm rounded-lg p-2 bg-card">←</a>
          <h1 className="font-display text-2xl sm:text-3xl font-black">🖼️ GIF 表情管理</h1>
        </div>

        <div className="border-brutal shadow-brutal rounded-2xl bg-card p-4 mb-6">
          <div className="font-display font-bold mb-2">{editing ? "編輯表情" : "新增表情"}</div>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <input value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="名稱（例：爆笑）" className="border-brutal rounded-lg px-2 py-1.5 bg-input" />
            <input value={draft.gif_url ?? ""} onChange={(e) => setDraft({ ...draft, gif_url: e.target.value })}
              placeholder="GIF URL（https:// 或 data:）" className="border-brutal rounded-lg px-2 py-1.5 bg-input" />
            <input type="number" min={0} value={draft.gem_price ?? 0}
              onChange={(e) => setDraft({ ...draft, gem_price: Number(e.target.value) })}
              placeholder="寶石價格" className="border-brutal rounded-lg px-2 py-1.5 bg-input" />
            <select value={draft.display_mode ?? "fullscreen"}
              onChange={(e) => setDraft({ ...draft, display_mode: e.target.value as any })}
              className="border-brutal rounded-lg px-2 py-1.5 bg-input">
              <option value="fullscreen">全螢幕蓋版</option>
              <option value="bar">底部小條</option>
            </select>
            <label className="flex items-center gap-2 text-xs col-span-full">
              <input type="checkbox" checked={draft.active ?? true}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              上架販售
            </label>
            {draft.gif_url && /^https?:|^data:/i.test(draft.gif_url) && (
              <div className="col-span-full">
                <img src={draft.gif_url} alt="" className="h-24 rounded border border-foreground/20" referrerPolicy="no-referrer" />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} disabled={saving}
              className="border-brutal shadow-brutal-sm rounded-xl bg-primary text-primary-foreground font-bold px-4 py-1.5 text-sm disabled:opacity-50">
              {saving ? "儲存中…" : editing ? "更新" : "新增"}
            </button>
            {editing && (
              <button onClick={() => { setEditing(null); setDraft({ display_mode: "fullscreen", gem_price: 10, active: true }); }}
                className="border-brutal rounded-xl px-3 py-1.5 text-sm bg-card">取消</button>
            )}
            <div className="ml-auto flex items-center gap-2 text-xs">
              <span>測試給自己：</span>
              <input type="number" value={gemAmt} onChange={(e) => setGemAmt(Number(e.target.value))}
                className="w-20 border-brutal rounded-lg px-2 py-1 bg-input" />
              <button onClick={grantGems}
                className="border-brutal shadow-brutal-sm rounded-lg bg-yellow-100 px-2 py-1 font-bold">+💎</button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {rows.length === 0 && <div className="text-center text-sm text-muted-foreground py-6">尚未新增任何 GIF 表情</div>}
          {rows.map((r) => (
            <div key={r.id} className="border-brutal shadow-brutal-sm rounded-xl bg-card p-3 flex items-center gap-3">
              <img src={r.gif_url} alt={r.name} className="w-16 h-16 object-cover rounded" referrerPolicy="no-referrer" />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.gem_price} 💎 · {r.display_mode === "fullscreen" ? "全螢幕" : "小條"} · {r.active ? "上架" : "下架"}
                </div>
              </div>
              <button onClick={() => { setEditing(r.id); setDraft(r); }} className="text-sm underline">編輯</button>
              <button onClick={() => remove(r.id)} className="text-sm text-destructive underline">刪除</button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}