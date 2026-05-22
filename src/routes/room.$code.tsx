import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES,
  type CategoryId,
  getClientId,
  getSavedAvatar,
  getSavedName,
  makeHint,
  pickColor,
  pickWords,
  ROUND_SECONDS,
} from "@/lib/game";
import { DrawingCanvas } from "@/components/game/DrawingCanvas";
import { ChatPanel } from "@/components/game/ChatPanel";
import { PlayersPanel, type Player } from "@/components/game/PlayersPanel";
import { Copy, LogOut, Pencil, RefreshCw, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/room/$code")({
  component: RoomPage,
  head: ({ params }) => ({
    meta: [{ title: `房間 ${params.code} · 畫聊` }],
  }),
});

type Room = {
  id: string;
  code: string;
  status: "waiting" | "picking" | "drawing" | "round_end" | "finished";
  round: number;
  max_rounds: number;
  current_drawer_id: string | null;
  current_word: string | null;
  word_hint: string | null;
  round_ends_at: string | null;
  host_client_id: string;
};

function RoomPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [me, setMe] = useState<Player | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const meClientId = useMemo(() => (typeof window === "undefined" ? "" : getClientId()), []);
  const myName = useMemo(() => (typeof window === "undefined" ? "" : getSavedName()), []);
  const myAvatar = useMemo(() => (typeof window === "undefined" ? "🐱" : getSavedAvatar()), []);
  const joinedRef = useRef(false);
  const [joining, setJoining] = useState(true);

  // Redirect if no name
  useEffect(() => {
    if (typeof window !== "undefined" && !getSavedName()) {
      navigate({ to: "/" });
    }
  }, [navigate]);

  // Tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // Load room + subscribe
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
      if (!active) return;
      if (error || !data) {
        toast.error("房間不存在");
        navigate({ to: "/" });
        return;
      }
      setRoom(data as Room);

      // Join as player (upsert)
      if (!joinedRef.current && myName) {
        joinedRef.current = true;
        await supabase.from("players").upsert(
          {
            room_id: data.id,
            client_id: meClientId,
            name: myName,
            color: pickColor(meClientId),
            avatar: myAvatar,
          },
          { onConflict: "room_id,client_id" },
        );
        await supabase.from("messages").insert({
          room_id: data.id,
          player_name: "系統",
          content: `${myAvatar} ${myName} 加入房間`,
          is_system: true,
        });
        setJoining(false);
      } else {
        setJoining(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [code, navigate, meClientId, myName, myAvatar]);

  // Subscribe to room updates
  useEffect(() => {
    if (!room?.id) return;
    const ch = supabase
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => setRoom(payload.new as Room),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [room?.id]);

  // Subscribe to players
  useEffect(() => {
    if (!room?.id) return;
    const load = async () => {
      const { data } = await supabase.from("players").select("*").eq("room_id", room.id);
      if (data) setPlayers(data as Player[]);
    };
    load();
    const ch = supabase
      .channel(`players:${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [room?.id]);

  // Track me
  useEffect(() => {
    setMe(players.find((p) => p.client_id === meClientId) ?? null);
  }, [players, meClientId]);

  // Leave on unload
  useEffect(() => {
    const leave = () => {
      if (room?.id && me?.id) {
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/players?id=eq.${me.id}`,
        );
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [room?.id, me?.id]);

  const isHost = room?.host_client_id === meClientId;
  const isDrawer = me != null && room?.current_drawer_id === me.id;
  const timeLeft =
    room?.round_ends_at && room.status === "drawing"
      ? Math.max(0, Math.ceil((new Date(room.round_ends_at).getTime() - now) / 1000))
      : 0;
  const isInfinite = (room?.max_rounds ?? 0) >= 9999;

  const setMaxRounds = useCallback(
    async (n: number) => {
      if (!room || !isHost) return;
      await supabase.from("rooms").update({ max_rounds: n }).eq("id", room.id);
    },
    [room, isHost],
  );

  const startNextRound = useCallback(async () => {
    if (!room || !isHost) return;
    if (players.length < 2) {
      toast.error("至少需要 2 位玩家才能開始！");
      return;
    }
    // pick next drawer: rotate by joined_at, skipping current
    const ordered = [...players].sort((a, b) => a.id.localeCompare(b.id));
    let nextIdx = 0;
    if (room.current_drawer_id) {
      const cur = ordered.findIndex((p) => p.id === room.current_drawer_id);
      nextIdx = (cur + 1) % ordered.length;
    }
    const next = ordered[nextIdx];
    await supabase.from("strokes").delete().eq("room_id", room.id);
    await supabase
      .from("players")
      .update({ guessed_correctly: false })
      .eq("room_id", room.id);
    await supabase
      .from("rooms")
      .update({
        status: "picking",
        current_drawer_id: next.id,
        current_word: null,
        word_hint: null,
        round_ends_at: null,
        round: (room.round ?? 0) + 1,
      })
      .eq("id", room.id);
  }, [room, isHost, players]);

  const finishGame = useCallback(async () => {
    if (!room || !isHost) return;
    await supabase.from("rooms").update({ status: "finished" }).eq("id", room.id);
  }, [room, isHost]);

  const resetGame = useCallback(async () => {
    if (!room || !isHost) return;
    await supabase.from("strokes").delete().eq("room_id", room.id);
    await supabase
      .from("players")
      .update({ score: 0, guessed_correctly: false })
      .eq("room_id", room.id);
    await supabase
      .from("rooms")
      .update({
        status: "waiting",
        round: 0,
        current_drawer_id: null,
        current_word: null,
        word_hint: null,
        round_ends_at: null,
      })
      .eq("id", room.id);
  }, [room, isHost]);

  // Word picker options (drawer only, when picking)
  const [category, setCategory] = useState<CategoryId>("animal");
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [customWord, setCustomWord] = useState("");
  const usedWordsRef = useRef<Set<string>>(new Set());

  // Regenerate options whenever category changes or a new picking round begins
  useEffect(() => {
    if (room?.status === "picking" && isDrawer && !room.current_word) {
      setWordOptions(pickWords(category, 3, usedWordsRef.current));
    } else if (room?.status !== "picking") {
      setCustomWord("");
    }
  }, [room?.status, isDrawer, room?.current_word, category]);

  function refreshWords() {
    setWordOptions(pickWords(category, 3, usedWordsRef.current));
  }

  async function chooseWord(w: string) {
    if (!room) return;
    usedWordsRef.current.add(w);
    const endsAt = new Date(Date.now() + ROUND_SECONDS * 1000).toISOString();
    await supabase
      .from("rooms")
      .update({
        status: "drawing",
        current_word: w,
        word_hint: makeHint(w),
        round_ends_at: endsAt,
      })
      .eq("id", room.id);
    setCustomWord("");
  }

  // End-of-round detection (host only)
  useEffect(() => {
    if (!room || !isHost || room.status !== "drawing") return;
    const nonDrawerCount = players.filter((p) => p.id !== room.current_drawer_id).length;
    const guessedCount = players.filter(
      (p) => p.id !== room.current_drawer_id && p.guessed_correctly,
    ).length;
    const allGuessed = nonDrawerCount > 0 && guessedCount >= nonDrawerCount;
    const timeUp = timeLeft <= 0;
    if (allGuessed || timeUp) {
      (async () => {
        // award drawer
        const drawer = players.find((p) => p.id === room.current_drawer_id);
        if (drawer && guessedCount > 0) {
          await supabase
            .from("players")
            .update({ score: drawer.score + guessedCount * 30 })
            .eq("id", drawer.id);
        }
        await supabase.from("messages").insert({
          room_id: room.id,
          player_name: "系統",
          content: `本回合答案：${room.current_word}`,
          is_system: true,
        });
        await supabase.from("rooms").update({ status: "round_end" }).eq("id", room.id);
      })();
    }
  }, [room, isHost, players, timeLeft]);

  async function onCorrectGuess() {
    if (!me || !room) return;
    const earned = 50 + Math.round((timeLeft / ROUND_SECONDS) * 50);
    await supabase
      .from("players")
      .update({ guessed_correctly: true, score: me.score + earned })
      .eq("id", me.id);
    toast.success(`+${earned} 分！`);
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    toast.success("已複製房間代碼");
  }

  if (!room || joining || players.length === 0) {
    return <JoiningScreen code={code} />;
  }

  const drawer = players.find((p) => p.id === room.current_drawer_id);
  const reachedEnd =
    !isInfinite && room.round >= room.max_rounds && room.status === "round_end";

  return (
    <main className="min-h-screen p-3 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => navigate({ to: "/" })}
          className="border-brutal shadow-brutal-sm rounded-xl bg-card px-3 py-2 text-sm font-semibold flex items-center gap-1.5 hover:translate-y-0.5 hover:shadow-none transition"
        >
          <LogOut className="w-4 h-4" /> 離開
        </button>
        <button
          onClick={copyCode}
          className="border-brutal shadow-brutal-sm rounded-xl bg-secondary px-4 py-2 font-mono font-bold tracking-widest flex items-center gap-2 hover:translate-y-0.5 hover:shadow-none transition"
        >
          {code} <Copy className="w-3.5 h-3.5" />
        </button>
        <div className="text-sm text-muted-foreground">
          回合 <span className="font-bold text-foreground">{isInfinite ? room.round : Math.min(room.round, room.max_rounds)}</span> / {isInfinite ? "∞" : room.max_rounds}
        </div>
        {room.status === "drawing" && (
          <div
            className={`ml-auto px-4 py-2 rounded-xl border-brutal shadow-brutal-sm font-display font-bold tabular-nums ${
              timeLeft <= 10 ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-accent text-accent-foreground"
            }`}
          >
            ⏱ {timeLeft}s
          </div>
        )}
      </div>

      {/* Word bar */}
      <div className="mb-4 bg-card border-brutal shadow-brutal rounded-2xl px-5 py-3 text-center">
        {room.status === "drawing" && drawer && (
          <>
            <div className="text-xs text-muted-foreground mb-0.5">
              {isDrawer ? "你的題目（請畫出來）" : `${drawer.name} 正在畫…`}
            </div>
            <div className="font-display font-bold text-2xl tracking-[0.3em]">
              {isDrawer ? room.current_word : room.word_hint}
            </div>
          </>
        )}
        {room.status === "waiting" && (
          <div className="font-display text-lg">
            等待房主開始遊戲 · 把代碼 <span className="font-mono font-bold">{code}</span> 分享給朋友！
          </div>
        )}
        {room.status === "picking" && (
          <div className="text-muted-foreground">
            {isDrawer ? "請選擇一個題目…" : `${drawer?.name ?? "玩家"} 正在選題…`}
          </div>
        )}
        {room.status === "round_end" && (
          <div className="font-display text-xl">
            🎉 答案是 <span className="text-primary font-bold">{room.current_word}</span>
          </div>
        )}
        {room.status === "finished" && (
          <div className="font-display text-xl flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-secondary-foreground" /> 遊戲結束！
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] xl:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <DrawingCanvas roomId={room.id} round={room.round} canDraw={isDrawer && room.status === "drawing"} />

          {/* Host / round controls */}
          {isHost && (room.status === "waiting" || room.status === "round_end") && !reachedEnd && (
            <button
              onClick={startNextRound}
              className="w-full border-brutal shadow-brutal rounded-2xl bg-primary text-primary-foreground font-display font-bold text-lg py-3 hover:translate-y-0.5 hover:shadow-none transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" /> {room.status === "waiting" ? "開始遊戲" : "下一回合"}
            </button>
          )}
          {isHost && room.status === "waiting" && (
            <div className="border-brutal shadow-brutal-sm rounded-2xl bg-card p-3">
              <div className="text-xs text-muted-foreground mb-2 font-semibold">回合數設定</div>
              <div className="flex flex-wrap gap-2">
                {[3, 5, 10, 9999].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMaxRounds(n)}
                    className={`px-3 py-1.5 rounded-lg border-2 text-sm font-bold transition ${
                      room.max_rounds === n
                        ? "border-foreground bg-primary text-primary-foreground"
                        : "border-foreground/30 bg-background hover:border-foreground"
                    }`}
                  >
                    {n === 9999 ? "∞ 無限" : `${n} 回合`}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isHost && reachedEnd && (
            <div className="flex flex-col gap-2">
              <button
                onClick={finishGame}
                className="w-full border-brutal shadow-brutal rounded-2xl bg-secondary font-display font-bold py-3 hover:translate-y-0.5 hover:shadow-none transition"
              >
                <Trophy className="w-5 h-5 inline mr-1" /> 結算
              </button>
              <button
                onClick={startNextRound}
                className="w-full border-brutal shadow-brutal rounded-2xl bg-primary text-primary-foreground font-display font-bold py-3 hover:translate-y-0.5 hover:shadow-none transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" /> 繼續再一回合
              </button>
            </div>
          )}
          {isHost && room.status === "finished" && (
            <div className="flex flex-col gap-2">
              <button
                onClick={resetGame}
                className="w-full border-brutal shadow-brutal rounded-2xl bg-accent font-display font-bold py-3 hover:translate-y-0.5 hover:shadow-none transition"
              >
                再玩一局（分數歸零）
              </button>
              <button
                onClick={startNextRound}
                className="w-full border-brutal shadow-brutal-sm rounded-2xl bg-card font-display font-bold py-3 hover:translate-y-0.5 hover:shadow-none transition"
              >
                繼續玩（保留分數）
              </button>
            </div>
          )}
          {!isHost && (room.status === "waiting" || room.status === "round_end" || room.status === "finished") && (
            <div className="text-center text-sm text-muted-foreground">
              {room.status === "finished" ? "等待房主決定是否再玩一局…" : "等待房主開始下一回合…"}
            </div>
          )}
        </div>

        <div className="space-y-4 flex flex-col min-w-0">
          <PlayersPanel
            players={players}
            hostClientId={room.host_client_id}
            drawerId={room.current_drawer_id}
            meClientId={meClientId}
          />
          <div className="min-h-[320px] md:h-[520px]">
            <ChatPanel
              roomId={room.id}
              playerName={myName}
              currentWord={room.status === "drawing" ? room.current_word : null}
              isDrawer={isDrawer}
              hasGuessed={me?.guessed_correctly ?? false}
              onCorrectGuess={onCorrectGuess}
            />
          </div>
        </div>
      </div>

      {/* Word picker modal */}
      <AnimatePresence>
        {room.status === "picking" && isDrawer && !room.current_word && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-card border-brutal shadow-brutal rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <h2 className="font-display font-bold text-2xl mb-1">挑一個題目來畫</h2>
              <p className="text-sm text-muted-foreground mb-4">其他玩家看不到答案</p>

              {/* Category tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition ${
                      category === c.id
                        ? "border-foreground bg-primary text-primary-foreground"
                        : "border-foreground/30 bg-background hover:border-foreground"
                    }`}
                  >
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3">
                {wordOptions.map((w) => (
                  <button
                    key={w}
                    onClick={() => chooseWord(w)}
                    className="border-brutal shadow-brutal-sm rounded-xl bg-secondary font-display font-bold text-xl py-4 hover:translate-y-0.5 hover:shadow-none hover:bg-primary hover:text-primary-foreground transition"
                  >
                    {w}
                  </button>
                ))}
              </div>

              <button
                onClick={refreshWords}
                className="mt-3 w-full border-2 border-foreground/30 rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-muted transition"
              >
                <RefreshCw className="w-4 h-4" /> 換一批題目
              </button>

              {/* Custom word */}
              <div className="mt-5 pt-4 border-t-2 border-foreground/15">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> 或自己出題（最多 5 字）
                </div>
                <div className="flex gap-2">
                  <input
                    value={customWord}
                    onChange={(e) => setCustomWord(e.target.value.slice(0, 5))}
                    maxLength={5}
                    placeholder="輸入題目…"
                    className="flex-1 border-2 border-foreground/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground bg-background"
                  />
                  <button
                    onClick={() => {
                      const t = customWord.trim();
                      if (t.length === 0 || t.length > 5) return;
                      chooseWord(t);
                    }}
                    disabled={customWord.trim().length === 0 || customWord.trim().length > 5}
                    className="border-brutal shadow-brutal-sm rounded-lg bg-accent px-4 font-bold text-sm hover:translate-y-0.5 hover:shadow-none transition disabled:opacity-50"
                  >
                    使用
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finished modal */}
      <AnimatePresence>
        {room.status === "finished" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-card border-brutal shadow-brutal rounded-3xl p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-7 h-7 text-secondary-foreground" />
                <h2 className="font-display font-bold text-2xl">最終結果</h2>
              </div>
              <ol className="space-y-2">
                {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
                  <li
                    key={p.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${
                      i === 0 ? "border-foreground bg-secondary" : "border-foreground/20 bg-background"
                    }`}
                  >
                    <span className="font-display font-bold text-xl w-6">{i + 1}</span>
                    <span className="flex-1 font-semibold">{p.name}</span>
                    <span className="font-mono font-bold text-lg">{p.score}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}