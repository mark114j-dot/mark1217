import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, MessageCircle, Search, UserPlus, X, ArrowLeft, Send, DoorOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/friends")({
  component: FriendsPage,
  head: () => ({ meta: [{ title: "好友 · 畫聊" }] }),
});

type ProfileRow = {
  id: string;
  username: string;
  avatar: string;
  is_online: boolean;
  current_room_code: string | null;
};

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
};

type DM = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

function FriendsPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileRow[]>([]);
  const [activeFriend, setActiveFriend] = useState<ProfileRow | null>(null);
  const [dms, setDms] = useState<DM[]>([]);
  const [dmText, setDmText] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  // Load friendships + counterparties
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      const list = (data ?? []) as Friendship[];
      setFriendships(list);
      const ids = Array.from(
        new Set(list.flatMap((f) => [f.requester_id, f.addressee_id]).filter((i) => i !== user.id)),
      );
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, avatar, is_online, current_room_code")
          .in("id", ids);
        const map: Record<string, ProfileRow> = {};
        (profs ?? []).forEach((p) => (map[(p as ProfileRow).id] = p as ProfileRow));
        setProfilesById(map);
      }
    };
    load();
    const ch = supabase
      .channel(`friends:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  // DM thread
  useEffect(() => {
    if (!user || !activeFriend) return;
    const load = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${activeFriend.id}),and(sender_id.eq.${activeFriend.id},receiver_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(200);
      setDms((data ?? []) as DM[]);
    };
    load();
    const ch = supabase
      .channel(`dm:${user.id}:${activeFriend.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as DM;
          if (
            (m.sender_id === user.id && m.receiver_id === activeFriend.id) ||
            (m.sender_id === activeFriend.id && m.receiver_id === user.id)
          ) {
            setDms((p) => [...p, m]);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, activeFriend]);

  async function runSearch() {
    const q = search.trim();
    if (!q || !user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar, is_online, current_room_code")
      .ilike("username", `%${q}%`)
      .neq("id", user.id)
      .limit(15);
    setSearchResults((data ?? []) as ProfileRow[]);
  }

  async function sendRequest(targetId: string) {
    if (!user) return;
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: targetId, status: "pending" });
    if (error) toast.error("已經邀請過了或失敗");
    else toast.success("好友邀請已送出！");
  }

  async function respond(f: Friendship, accept: boolean) {
    await supabase
      .from("friendships")
      .update({ status: accept ? "accepted" : "rejected" })
      .eq("id", f.id);
    toast.success(accept ? "已成為好友 🎉" : "已拒絕");
  }

  async function removeFriendship(f: Friendship) {
    await supabase.from("friendships").delete().eq("id", f.id);
    if (activeFriend && (activeFriend.id === f.requester_id || activeFriend.id === f.addressee_id)) {
      setActiveFriend(null);
    }
  }

  async function sendDM() {
    if (!user || !activeFriend) return;
    const t = dmText.trim();
    if (!t) return;
    setDmText("");
    await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: activeFriend.id,
      content: t,
    });
  }

  if (!user) return null;

  const incoming = friendships.filter(
    (f) => f.status === "pending" && f.addressee_id === user.id,
  );
  const outgoing = friendships.filter(
    (f) => f.status === "pending" && f.requester_id === user.id,
  );
  const accepted = friendships.filter((f) => f.status === "accepted");

  function other(f: Friendship): ProfileRow | undefined {
    const id = f.requester_id === user!.id ? f.addressee_id : f.requester_id;
    return profilesById[id];
  }

  return (
    <main className="min-h-screen p-3 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link
          to="/"
          className="border-brutal shadow-brutal-sm rounded-xl bg-card px-3 py-2 text-sm font-semibold flex items-center gap-1.5 hover:translate-y-0.5 hover:shadow-none transition"
        >
          <ArrowLeft className="w-4 h-4" /> 首頁
        </Link>
        <h1 className="font-display font-bold text-2xl">好友</h1>
        <div className="ml-auto text-sm text-muted-foreground">
          {profile?.avatar} {profile?.username}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_1.2fr] gap-4 items-start">
        {/* Left: lists */}
        <div className="space-y-4">
          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border-brutal shadow-brutal rounded-2xl p-4"
          >
            <div className="font-display font-bold mb-2 flex items-center gap-1.5">
              <Search className="w-4 h-4" /> 找朋友
            </div>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="輸入顯示名稱"
                className="flex-1 border-2 border-foreground/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground bg-background"
              />
              <button
                onClick={runSearch}
                className="border-brutal shadow-brutal-sm rounded-lg bg-primary text-primary-foreground px-3 text-sm font-bold hover:translate-y-0.5 hover:shadow-none transition"
              >
                搜尋
              </button>
            </div>
            {searchResults.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {searchResults.map((p) => {
                  const already = friendships.find(
                    (f) => f.requester_id === p.id || f.addressee_id === p.id,
                  );
                  return (
                    <li key={p.id} className="flex items-center gap-2 px-2 py-2 rounded-lg bg-background border border-foreground/15">
                      <span className="text-xl">{p.avatar}</span>
                      <span className="flex-1 font-semibold text-sm truncate">{p.username}</span>
                      {already ? (
                        <span className="text-xs text-muted-foreground">{already.status === "accepted" ? "已是好友" : "已邀請"}</span>
                      ) : (
                        <button
                          onClick={() => sendRequest(p.id)}
                          className="border-brutal shadow-brutal-sm rounded-lg bg-accent px-2.5 py-1 text-xs font-bold flex items-center gap-1 hover:translate-y-0.5 hover:shadow-none transition"
                        >
                          <UserPlus className="w-3 h-3" /> 加好友
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>

          {/* Incoming */}
          {incoming.length > 0 && (
            <div className="bg-card border-brutal shadow-brutal rounded-2xl p-4">
              <div className="font-display font-bold mb-2">📩 邀請你的人 ({incoming.length})</div>
              <ul className="space-y-1.5">
                {incoming.map((f) => {
                  const o = other(f);
                  return (
                    <li key={f.id} className="flex items-center gap-2 px-2 py-2 rounded-lg bg-background border border-foreground/15">
                      <span className="text-xl">{o?.avatar ?? "🐱"}</span>
                      <span className="flex-1 font-semibold text-sm truncate">{o?.username ?? "玩家"}</span>
                      <button
                        onClick={() => respond(f, true)}
                        className="border-2 border-foreground rounded-lg bg-primary text-primary-foreground px-2 py-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => respond(f, false)}
                        className="border-2 border-foreground/30 rounded-lg px-2 py-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Friends */}
          <div className="bg-card border-brutal shadow-brutal rounded-2xl p-4">
            <div className="font-display font-bold mb-2">我的好友 ({accepted.length})</div>
            {accepted.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">還沒有好友，去搜尋一個吧！</p>
            ) : (
              <ul className="space-y-1.5">
                {accepted.map((f) => {
                  const o = other(f);
                  if (!o) return null;
                  const active = activeFriend?.id === o.id;
                  return (
                    <li
                      key={f.id}
                      className={`flex items-center gap-2 px-2 py-2 rounded-lg border transition cursor-pointer ${
                        active ? "border-foreground bg-secondary/50" : "border-foreground/15 bg-background hover:border-foreground/40"
                      }`}
                      onClick={() => setActiveFriend(o)}
                    >
                      <span className="relative">
                        <span className="text-xl">{o.avatar}</span>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-card ${
                            o.is_online ? "bg-green-500" : "bg-muted-foreground/40"
                          }`}
                        />
                      </span>
                      <span className="flex-1 font-semibold text-sm truncate">{o.username}</span>
                      {o.current_room_code && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({ to: "/room/$code", params: { code: o.current_room_code! } });
                          }}
                          title="加入他的房間"
                          className="border-brutal shadow-brutal-sm rounded-lg bg-accent px-2 py-1 text-xs font-bold flex items-center gap-1 hover:translate-y-0.5 hover:shadow-none transition"
                        >
                          <DoorOpen className="w-3 h-3" /> {o.current_room_code}
                        </button>
                      )}
                      <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFriendship(f);
                        }}
                        title="刪除好友"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {outgoing.length > 0 && (
            <div className="bg-card border-brutal shadow-brutal-sm rounded-2xl p-3 text-xs text-muted-foreground">
              已送出邀請 {outgoing.length} 個，等待對方接受
            </div>
          )}
        </div>

        {/* Right: DM */}
        <div className="bg-card border-brutal shadow-brutal rounded-2xl overflow-hidden flex flex-col h-[70vh] md:h-[600px]">
          {activeFriend ? (
            <>
              <div className="px-4 py-3 border-b-2 border-foreground bg-secondary flex items-center gap-2">
                <span className="text-xl">{activeFriend.avatar}</span>
                <div className="flex-1">
                  <div className="font-display font-bold leading-tight">{activeFriend.username}</div>
                  <div className="text-xs text-muted-foreground">
                    {activeFriend.is_online ? "🟢 線上" : "離線"}
                    {activeFriend.current_room_code && ` · 在房間 ${activeFriend.current_room_code}`}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-sm">
                {dms.length === 0 && (
                  <p className="text-center text-muted-foreground text-xs py-6">開始聊天吧！</p>
                )}
                {dms.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] px-3 py-1.5 rounded-2xl ${
                          mine ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t-2 border-foreground p-2 flex gap-2 bg-background">
                <input
                  value={dmText}
                  onChange={(e) => setDmText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendDM()}
                  maxLength={200}
                  placeholder="輸入訊息…"
                  className="flex-1 border-2 border-foreground/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground bg-background"
                />
                <button
                  onClick={sendDM}
                  className="border-brutal shadow-brutal-sm rounded-lg bg-primary text-primary-foreground px-3 hover:translate-y-0.5 hover:shadow-none transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
              選一個好友開始聊天，或看他在哪個房間
            </div>
          )}
        </div>
      </div>
    </main>
  );
}