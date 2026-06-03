import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { MINI_GAMES } from "@/lib/miniGames";
import { getClientId, getSavedName, getSavedAvatar, makeRoomCode, saveName } from "@/lib/game";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/games")({
  component: GamesHub,
  head: () => ({
    meta: [
      { title: "小遊戲大廳 — 10 款連線多人遊戲" },
      { name: "description", content: "井字遊戲、五子棋、黑白棋、記憶翻牌等 10 款即時連線小遊戲。" },
    ],
  }),
});

function GamesHub() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getClientId();
    setName(getSavedName());
  }, []);

  async function createRoom(gameId: string) {
    if (!name.trim()) return toast.error("先輸入你的名字！");
    saveName(name.trim());
    const me = { client_id: getClientId(), name: name.trim(), avatar: getSavedAvatar(), score: 0 };
    for (let i = 0; i < 5; i++) {
      const c = makeRoomCode();
      const { data, error } = await supabase
        .from("mini_rooms")
        .insert({ code: c, game_type: gameId, host_client_id: me.client_id, players: [me], state: {} })
        .select()
        .single();
      if (!error && data) {
        navigate({ to: "/mini/$type/$code", params: { type: gameId, code: c } });
        return;
      }
    }
    toast.error("建立房間失敗");
  }

  async function joinRoom() {
    if (!name.trim()) return toast.error("先輸入你的名字！");
    if (!code.trim()) return toast.error("輸入房號");
    saveName(name.trim());
    const upper = code.trim().toUpperCase();
    const { data } = await supabase.from("mini_rooms").select("game_type").eq("code", upper).maybeSingle();
    if (!data) return toast.error("找不到房間");
    navigate({ to: "/mini/$type/$code", params: { type: data.game_type, code: upper } });
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="border-brutal shadow-brutal-sm rounded-lg p-2 bg-card hover:translate-y-0.5 hover:shadow-none transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-black">🎮 小遊戲大廳</h1>
        </div>

        <div className="bg-card border-brutal shadow-brutal rounded-2xl p-4 mb-6 grid sm:grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你的名字"
            maxLength={16}
            className="border-2 border-foreground/40 rounded-lg px-3 py-2 focus:outline-none focus:border-foreground"
          />
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="輸入房號加入"
              maxLength={6}
              className="flex-1 border-2 border-foreground/40 rounded-lg px-3 py-2 focus:outline-none focus:border-foreground font-mono uppercase"
            />
            <button onClick={joinRoom} className="border-brutal shadow-brutal-sm rounded-lg bg-primary text-primary-foreground px-4 font-bold hover:translate-y-0.5 hover:shadow-none transition">
              加入
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {MINI_GAMES.map((g, i) => (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => {
                setSelected(g.id);
                createRoom(g.id);
              }}
              disabled={selected === g.id}
              className="border-brutal shadow-brutal rounded-2xl p-4 bg-card hover:translate-y-1 hover:shadow-none transition text-left disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${g.color}22, transparent)` }}
            >
              <div className="text-4xl mb-2">{g.emoji}</div>
              <div className="font-display font-bold text-base">{g.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{g.desc}</div>
              <div className="text-xs font-mono mt-1.5 text-foreground/70">{g.players}</div>
            </motion.button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          點任一遊戲建立房間 → 分享房號給朋友 → 開始連線對戰
        </p>
      </div>
    </div>
  );
}