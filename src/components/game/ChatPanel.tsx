import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";

type Msg = {
  id: string;
  player_name: string;
  content: string;
  is_correct: boolean;
  is_system: boolean;
  created_at: string;
};

export function ChatPanel({
  roomId,
  playerName,
  currentWord,
  isDrawer,
  hasGuessed,
  onCorrectGuess,
}: {
  roomId: string;
  playerName: string;
  currentWord: string | null;
  isDrawer: boolean;
  hasGuessed: boolean;
  onCorrectGuess: () => Promise<void> | void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => data && setMsgs(data as Msg[]));

    const ch = supabase
      .channel(`msgs:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => setMsgs((prev) => [...prev, payload.new as Msg].slice(-200)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    const t = text.trim();
    if (!t) return;
    setText("");

    if (currentWord && !isDrawer && !hasGuessed && t === currentWord) {
      await supabase.from("messages").insert({
        room_id: roomId,
        player_name: playerName,
        content: `${playerName} 猜對了！🎉`,
        is_correct: true,
        is_system: true,
      });
      await onCorrectGuess();
      return;
    }
    // hide the message from drawer flooding spoilers? we still send all
    await supabase.from("messages").insert({
      room_id: roomId,
      player_name: playerName,
      content: t,
      is_correct: false,
      is_system: false,
    });
  }

  return (
    <div className="flex flex-col h-full bg-card border-brutal shadow-brutal rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b-2 border-foreground bg-secondary font-display font-bold">
        💬 聊天 / 猜答
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-sm">
        {msgs.length === 0 && (
          <p className="text-muted-foreground text-center py-6 text-xs">在這裡輸入你的猜題答案…</p>
        )}
        {msgs.map((m) => (
          <div
            key={m.id}
            className={
              m.is_correct
                ? "px-2 py-1.5 rounded-md bg-accent/30 border border-accent font-semibold"
                : m.is_system
                  ? "px-2 py-1 text-xs text-muted-foreground italic"
                  : "px-2 py-1"
            }
          >
            {!m.is_system && <span className="font-semibold mr-1.5">{m.player_name}:</span>}
            <span>{m.content}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t-2 border-foreground p-2 flex gap-2 bg-background">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          maxLength={80}
          disabled={isDrawer}
          placeholder={isDrawer ? "你正在畫畫…" : hasGuessed ? "你已經猜對了！" : "輸入答案…"}
          className="flex-1 border-2 border-foreground/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground bg-background disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={isDrawer}
          className="border-brutal shadow-brutal-sm rounded-lg bg-primary text-primary-foreground px-3 hover:translate-y-0.5 hover:shadow-none transition disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}