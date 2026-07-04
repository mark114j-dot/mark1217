import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { checkAdmin } from "@/lib/studio.functions";
import {
  listAnnouncementsAdmin, upsertAnnouncement, deleteAnnouncement,
  type Announcement, type AnnouncementKind,
} from "@/lib/announcements.functions";

export const Route = createFileRoute("/admin/announcements")({
  component: AdminAnnouncements,
  head: () => ({ meta: [{ title: "公告管理 — 畫聊 Doodle" }] }),
});

function AdminAnnouncements() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const check = useServerFn(checkAdmin);
  useEffect(() => {
    if (loading) return;
    if (!user) { setIsAdmin(false); return; }
    check().then((r) => setIsAdmin(r.isAdmin)).catch(() => setIsAdmin(false));
  }, [user, loading]);

  const list = useServerFn(listAnnouncementsAdmin);
  const save = useServerFn(upsertAnnouncement);
  const del = useServerFn(deleteAnnouncement);

  const [rows, setRows] = useState<Announcement[]>([]);
  const [editing, setEditing] = useState<Partial<Announcement>>({
    kind: "update", title: "", body: "", active: true, block_play: false, require_typing: false,
  });

  async function refresh() {
    if (!isAdmin) return;
    try { setRows(await list()); } catch (e) { toast.error(String(e)); }
  }
  useEffect(() => { refresh(); }, [isAdmin]);

  if (loading || isAdmin === null) return <main className="min-h-screen grid place-items-center">讀取中…</main>;
  if (!isAdmin) return <main className="min-h-screen grid place-items-center p-6">
    <div className="border-brutal shadow-brutal rounded-2xl bg-card p-6 text-center">
      <div className="text-4xl mb-2">🔒</div>
      <div className="font-display font-bold text-xl mb-2">僅限管理員</div>
      <Link to="/" className="underline">回首頁</Link>
    </div>
  </main>;

  const kinds: Array<{ v: AnnouncementKind; label: string }> = [
    { v: "update", label: "🔔 更新公告" }, { v: "event", label: "🎉 活動公告" },
    { v: "maintenance", label: "🛠 維護公告" }, { v: "urgent", label: "🚨 緊急通知" },
  ];

  return (
    <main className="min-h-screen bg-background p-4 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/" className="border-brutal shadow-brutal-sm rounded-lg px-3 py-1.5 bg-card">← 回首頁</Link>
        <h1 className="font-display text-2xl font-bold">公告管理</h1>
      </div>

      <div className="border-brutal shadow-brutal rounded-2xl bg-card p-4 space-y-2">
        <div className="font-bold">新增／編輯</div>
        <select value={editing.kind ?? "update"}
          onChange={(e) => setEditing({ ...editing, kind: e.target.value as AnnouncementKind })}
          className="w-full border-brutal rounded-lg px-2 py-2 bg-input">
          {kinds.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
        </select>
        <input placeholder="標題" value={editing.title ?? ""}
          onChange={(e) => setEditing({ ...editing, title: e.target.value })}
          className="w-full border-brutal rounded-lg px-2 py-2 bg-input" />
        <textarea placeholder="內容（若啟用『需打字確認』，玩家必須一字不差輸入）" rows={4}
          value={editing.body ?? ""}
          onChange={(e) => setEditing({ ...editing, body: e.target.value })}
          className="w-full border-brutal rounded-lg px-2 py-2 bg-input" />
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={editing.active ?? true}
            onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> 啟用中</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={editing.block_play ?? false}
            onChange={(e) => setEditing({ ...editing, block_play: e.target.checked })} /> 進遊戲前顯示（封鎖遊玩）</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={editing.require_typing ?? false}
            onChange={(e) => setEditing({ ...editing, require_typing: e.target.checked })} /> 需要打字確認</label>
        </div>
        <div className="flex gap-2">
          <button onClick={async () => {
            try { await save({ data: editing as any }); toast.success("已儲存"); setEditing({ kind: "update", title: "", body: "", active: true, block_play: false, require_typing: false }); refresh(); }
            catch (e) { toast.error(String(e)); }
          }} className="border-brutal shadow-brutal-sm rounded-lg px-3 py-1.5 bg-primary text-primary-foreground font-bold">
            {editing.id ? "更新" : "新增"}
          </button>
          {editing.id && <button onClick={() => setEditing({ kind: "update", title: "", body: "", active: true, block_play: false, require_typing: false })}
            className="border-brutal shadow-brutal-sm rounded-lg px-3 py-1.5 bg-card">取消編輯</button>}
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="border-brutal shadow-brutal-sm rounded-xl bg-card p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">{r.kind}{r.active ? " · 啟用" : " · 停用"}{r.block_play ? " · 封鎖" : ""}{r.require_typing ? " · 需打字" : ""}</div>
                <div className="font-bold">{r.title}</div>
                <pre className="text-xs whitespace-pre-wrap text-muted-foreground">{r.body}</pre>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setEditing(r)} className="text-xs underline">編輯</button>
                <button onClick={async () => { if (!confirm("刪除？")) return; await del({ data: { id: r.id } }); refresh(); }} className="text-xs text-destructive underline">刪除</button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-muted-foreground">尚無公告</div>}
      </div>
    </main>
  );
}