import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { acceptCreatorInvitation } from "@/lib/creatorCollaboration.functions";

export const Route = createFileRoute("/game-invite/$token")({ component: InvitePage });

function InvitePage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const acceptFn = useServerFn(acceptCreatorInvitation);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function accept() {
    if (!user || busy) return;
    setBusy(true);
    try {
      const result = await acceptFn({ data: { token } });
      toast.success("已加入共同創作！");
      await navigate({ to: "/game-editor/$gameId", params: { gameId: result.game_id } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "接受邀請失敗"); setBusy(false); }
  }

  useEffect(() => { if (user) accept(); }, [user]);

  if (loading) return <main className="min-h-screen grid place-items-center">讀取中…</main>;
  if (!user) return <main className="min-h-screen grid place-items-center p-6"><div className="max-w-md rounded-2xl border bg-card p-7 text-center space-y-4"><div className="text-5xl">👥</div><h1 className="text-2xl font-black">遊戲共同創作邀請</h1><p className="text-muted-foreground">登入後即可接受邀請，和遊戲建立者一起修改遊戲。</p><Link to="/login" className="inline-block rounded-xl border bg-primary px-5 py-3 font-bold text-primary-foreground">登入並加入</Link></div></main>;
  return <main className="min-h-screen grid place-items-center p-6"><div className="rounded-2xl border bg-card p-7 text-center space-y-4"><div className="text-5xl">🎮</div><h1 className="text-2xl font-black">正在加入共同創作…</h1><p className="text-muted-foreground">{busy ? "正在確認邀請並加入遊戲。" : "處理完成。"}</p></div></main>;
}
