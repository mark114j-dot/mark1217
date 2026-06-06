import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Smile, ShoppingBag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { FREE_EMOTES, getOwnedEmotes } from "@/lib/items";
import { sfx } from "@/lib/sfx";
import type { MiniRoom, MiniPlayer } from "@/lib/useMiniRoom";

type Props = {
  room: MiniRoom;
  meId: string;
  update: (patch: { state?: any; players?: MiniPlayer[] }) => Promise<void>;
};

export function EmoteBar({ room, meId, update }: Props) {
  const [open, setOpen] = useState(false);
  const [emotes, setEmotes] = useState<string[]>(FREE_EMOTES);
  const [floating, setFloating] = useState<{ id: number; emoji: string; by: string; mine: boolean } | null>(null);
  const lastSeen = (room.state as any)?._emote?.at ?? 0;

  useEffect(() => { getOwnedEmotes().then(setEmotes); }, []);

  // Pop incoming emote
  useEffect(() => {
    const e = (room.state as any)?._emote;
    if (!e || !e.at) return;
    const id = e.at as number;
    const mine = e.by === meId;
    setFloating({ id, emoji: e.emoji, by: e.by, mine });
    if (!mine) sfx.pop?.();
    const t = setTimeout(() => setFloating((f) => (f?.id === id ? null : f)), 2200);
    return () => clearTimeout(t);
  }, [lastSeen, meId]);

  async function send(emoji: string) {
    setOpen(false);
    sfx.click?.();
    await update({ state: { ...(room.state as any), _emote: { by: meId, emoji, at: Date.now() } } });
  }

  const sender = floating ? room.players.find((p) => p.client_id === floating.by) : null;

  return (
    <>
      {/* floating bubble */}
      <AnimatePresence>
        {floating && (
          <motion.div
            key={floating.id}
            initial={{ opacity: 0, y: 30, scale: 0.6 }}
            animate={{ opacity: 1, y: -20, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-28 z-50 pointer-events-none"
          >
            <div className="border-brutal shadow-brutal bg-card rounded-2xl px-4 py-2 flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">{sender?.avatar} {sender?.name}</span>
              <span className="text-4xl">{floating.emoji}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* picker */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="border-brutal shadow-brutal bg-card rounded-2xl p-2 max-w-[280px]"
            >
              <div className="grid grid-cols-6 gap-1 max-h-[200px] overflow-y-auto">
                {emotes.map((e) => (
                  <button
                    key={e}
                    onClick={() => send(e)}
                    className="text-2xl p-1.5 rounded-lg hover:bg-secondary hover:scale-110 transition"
                  >
                    {e}
                  </button>
                ))}
              </div>
              <Link
                to="/shop"
                className="mt-2 flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border-t pt-1.5"
              >
                <ShoppingBag className="w-3 h-3" /> 解鎖更多表情
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setOpen((v) => !v)}
          className="border-brutal shadow-brutal rounded-full w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center hover:translate-y-0.5 hover:shadow-none transition"
          title="送出表情"
        >
          <Smile className="w-6 h-6" />
        </button>
      </div>
    </>
  );
}