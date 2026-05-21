import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { getClientId, getSavedName, makeRoomCode, saveName } from "@/lib/game";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "畫聊 Doodle — 即時繪圖猜謂多人遊戲" },
      { name: "description", content: "和朋友一起畫畫猜題！建立房間、分享代碼、即時繪圖對戰。" },
    ],
  }),
});

function Index() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);

  useEffect(() => {
    getClientId();
    setName(getSavedName());
  }, []);

  async function handleCreate() {
    if (!name.trim()) return toast.error("先輸入你的名字！");
    saveName(name.trim());
    setLoading("create");
    try {
      let attempts = 0;
      while (attempts++ < 5) {
        const roomCode = makeRoomCode();
        const { data, error } = await supabase
          .from("rooms")
          .insert({ code: roomCode, host_client_id: getClientId() })
          .select()
          .single();
        if (!error && data) {
          navigate({ to: "/room/$code", params: { code: roomCode } });
          return;
        }
      }
      toast.error("建立房間失敗，請再試一次");
    } finally {
      setLoading(null);
    }
  }

  async function handleJoin() {
    if (!name.trim()) return toast.error("先輸入你的名字！");
    if (!code.trim()) return toast.error("請輸入房間代碼");
    saveName(name.trim());
    setLoading("join");
    const upper = code.trim().toUpperCase();
    const { data } = await supabase.from("rooms").select("code").eq("code", upper).maybeSingle();
    setLoading(null);
    if (!data) return toast.error("找不到這個房間");
    navigate({ to: "/room/$code", params: { code: upper } });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="inline-block border-brutal shadow-brutal bg-secondary rounded-2xl px-5 py-2 -rotate-2 mb-4">
            <span className="font-hand text-2xl">multiplayer • 即時對戰</span>
          </div>
          <h1 className="text-6xl font-display font-bold tracking-tight">
            畫<span className="text-primary">聊</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            畫一張圖，朋友來猜題 — 像 Skribbl，但更可愛
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { delay: 0.1 } }}
          className="bg-card border-brutal shadow-brutal rounded-3xl p-6 space-y-5"
        >
          <label className="block">
            <span className="text-sm font-semibold mb-1.5 block">你的名字</span>
            <input
              value={name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：小明"
              className="w-full border-brutal rounded-xl px-4 py-3 bg-input focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          <button
            onClick={handleCreate}
            disabled={loading !== null}
            className="w-full border-brutal shadow-brutal-sm rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg py-3 hover:translate-y-0.5 hover:shadow-none transition disabled:opacity-50"
          >
            {loading === "create" ? "建立中…" : "建立新房間 →"}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-foreground/20" />
            <span className="text-xs text-muted-foreground">或</span>
            <div className="flex-1 h-px bg-foreground/20" />
          </div>

          <div className="flex gap-2">
            <input
              value={code}
              maxLength={5}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="房間代碼"
              className="flex-1 border-brutal rounded-xl px-4 py-3 bg-input font-mono tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={handleJoin}
              disabled={loading !== null}
              className="border-brutal shadow-brutal-sm rounded-xl bg-accent text-accent-foreground font-display font-bold px-5 hover:translate-y-0.5 hover:shadow-none transition disabled:opacity-50"
            >
              加入
            </button>
          </div>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          無需登入 · 把房間代碼分享給朋友就能開玩
        </p>
      </div>
    </main>
  );
}
