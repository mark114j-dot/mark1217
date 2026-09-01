import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getMyInvite, inviteLeaderboard, claimInviterRewards } from "@/lib/invites.functions";
import { getClientId } from "@/lib/game";

export const Route = createFileRoute("/invite")({
  component: InvitePage,
  head: () => ({
    meta: [
      { title: "好友邀請與排行榜 — 邀請朋友拿寶石｜畫聊 Doodle" },
      { name: "description", content: "分享你的專屬邀請碼或連結，每成功邀請一位朋友加入畫聊 Doodle 就能領取寶石獎勵，並在每日、每週邀請排行榜上一較高下。" },
      { property: "og:title", content: "好友邀請與排行榜 — 邀請朋友拿寶石" },
      { property: "og:description", content: "分享邀請碼領取寶石獎勵，並在每日與每週邀請排行榜上競爭名次。" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://mark1217.lovable.app/invite" },
    ],
    links: [{ rel: "canonical", href: "https://mark1217.lovable.app/invite" }],
  }),
});

type Range = "day" | "week" | "month" | "all";
type Row = { referrer_id: string; count: number; username: string; avatar: string; country: string | null };

function InvitePage() {
  const { user, loading } = useAuth();
  const getInv = useServerFn(getMyInvite);
  const boardFn = useServerFn(inviteLeaderboard);
  const claimFn = useServerFn(claimInviterRewards);

  const [info, setInfo] = useState<{ invite_code: string; username: string; avatar: string; invited_count: number } | null>(null);
  const [range, setRange] = useState<Range>("week");
  const [board, setBoard] = useState<Row[]>([]);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    getInv().then((r: any) => setInfo(r)).catch((e: any) => toast.error(e.message));
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    boardFn({ data: { range } }).then((r: any) => setBoard(r)).catch(() => {});
  }, [range, user]);

  if (loading) return <main className="min-h-screen grid place-items-center">讀取中…</main>;
  if (!user) return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="border-brutal shadow-brutal rounded-2xl bg-card p-6 text-center max-w-sm">
        <div className="text-5xl mb-2">👥</div>
        <div className="font-display text-xl font-bold mb-2">好友邀請</div>
        <p className="text-sm text-muted-foreground mb-3">請先登入以取得你的專屬邀請碼與獎勵。</p>
        <Link to="/login" className="border-brutal shadow-brutal-sm rounded-xl px-4 py-2 bg-primary text-primary-foreground font-bold inline-block">登入 / 註冊</Link>
      </div>
    </main>
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteLink = info ? `${origin}/login?ref=${info.invite_code}` : "";
  const qrUrl = info
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inviteLink)}`
    : "";

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(`已複製${label}`));
  }

  async function claim() {
    setClaiming(true);
    try {
      const r: any = await claimFn({ data: { clientId: getClientId() } });
      if (r.granted > 0) toast.success(`已領取 ${r.granted} 寶石 💎`);
      else toast("暫無可領取的獎勵");
    } catch (e: any) { toast.error(e.message); }
    finally { setClaiming(false); }
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="border-brutal shadow-brutal-sm rounded-lg p-2 bg-card">←</Link>
          <h1 className="font-display text-2xl sm:text-3xl font-black">👥 好友邀請</h1>
        </div>

        {info && (
          <section className="border-brutal shadow-brutal rounded-2xl bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-4xl">{info.avatar}</div>
              <div className="flex-1">
                <div className="font-display font-bold">{info.username}</div>
                <div className="text-xs text-muted-foreground">已邀請 {info.invited_count} 位好友</div>
              </div>
              <button onClick={claim} disabled={claiming}
                className="border-brutal shadow-brutal-sm rounded-xl px-3 py-1.5 bg-yellow-100 font-bold text-sm disabled:opacity-50">
                {claiming ? "領取中…" : "💎 領取寶石"}
              </button>
            </div>
            <div className="grid sm:grid-cols-[220px_1fr] gap-4 items-start">
              <img src={qrUrl} alt="QR" className="w-[220px] h-[220px] rounded-lg border-brutal bg-white p-2 mx-auto" />
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">你的邀請碼</div>
                  <div className="flex gap-2">
                    <div className="flex-1 border-brutal rounded-lg px-3 py-2 font-mono font-bold text-lg tracking-widest bg-input">{info.invite_code}</div>
                    <button onClick={() => copy(info.invite_code, "邀請碼")} className="border-brutal shadow-brutal-sm rounded-lg px-3 bg-primary text-primary-foreground font-bold">複製</button>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">邀請連結</div>
                  <div className="flex gap-2">
                    <input readOnly value={inviteLink} className="flex-1 border-brutal rounded-lg px-2 py-2 bg-input text-xs font-mono truncate" />
                    <button onClick={() => copy(inviteLink, "連結")} className="border-brutal shadow-brutal-sm rounded-lg px-3 bg-primary text-primary-foreground font-bold">複製</button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2 border border-foreground/10">
                  邀請人與新玩家各得 <b>+10 💎</b> 寶石（新玩家完成註冊後生效）。
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="border-brutal shadow-brutal rounded-2xl bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display font-bold">🏆 邀請排行榜</div>
            <div className="flex gap-1 flex-wrap">
              {([
                ["day", "今日"], ["week", "本週"], ["month", "本月"], ["all", "全部"],
              ] as [Range, string][]).map(([k, l]) => (
                <button key={k} onClick={() => setRange(k)}
                  className={`text-xs border rounded-full px-2 py-0.5 ${range === k ? "bg-primary text-primary-foreground border-primary" : "border-foreground/30"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            {board.length === 0 && <div className="text-center text-sm text-muted-foreground py-4">本區間尚無邀請紀錄</div>}
            {board.map((r, i) => (
              <div key={r.referrer_id} className="flex items-center gap-3 border border-foreground/10 rounded-lg px-3 py-2 bg-card">
                <div className="w-6 text-center font-bold text-muted-foreground">{i + 1}</div>
                <div className="text-2xl">{r.avatar}</div>
                <div className="flex-1 truncate">
                  <span className="font-bold">{r.username}</span>
                  {r.country && <span className="ml-2 text-xs text-muted-foreground">{r.country}</span>}
                </div>
                <div className="font-mono font-bold">{r.count} 位</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}