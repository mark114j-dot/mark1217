import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Coins } from "lucide-react";
import { toast } from "sonner";
import { SHOP_AVATARS, getWallet, getOwned, buyAvatar, FREE_AVATARS } from "@/lib/wallet";
import { saveAvatar } from "@/lib/game";
import { sfx } from "@/lib/sfx";

export const Route = createFileRoute("/shop")({
  component: Shop,
  head: () => ({ meta: [{ title: "頭像商店 — 用金幣解鎖角色" }] }),
});

const RARITY_STYLE: Record<string, string> = {
  common: "from-slate-200 to-slate-100 border-slate-400",
  rare: "from-sky-200 to-sky-100 border-sky-500",
  epic: "from-violet-200 to-fuchsia-100 border-violet-500",
  legendary: "from-amber-200 to-orange-100 border-amber-500",
};

function Shop() {
  const [coins, setCoins] = useState(0);
  const [owned, setOwned] = useState<string[]>(FREE_AVATARS);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const w = await getWallet();
      setCoins(w.coins);
      setOwned(await getOwned());
    })();
  }, []);

  async function purchase(emoji: string) {
    setBusy(emoji);
    const res = await buyAvatar(emoji);
    setBusy(null);
    if (!res.ok) {
      sfx.lose();
      toast.error(res.reason ?? "購買失敗");
      return;
    }
    sfx.coin();
    toast.success(`解鎖 ${emoji}！`);
    setCoins(res.coins ?? coins);
    setOwned((o) => [...o, emoji]);
  }

  function equip(emoji: string) {
    saveAvatar(emoji);
    sfx.click();
    toast.success(`已裝備 ${emoji}`);
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="border-brutal shadow-brutal-sm rounded-lg p-2 bg-card hover:translate-y-0.5 hover:shadow-none transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-black">🛍️ 頭像商店</h1>
          <div className="ml-auto flex items-center gap-2 border-brutal shadow-brutal-sm bg-yellow-100 px-3 py-1.5 rounded-xl font-mono font-bold">
            <Coins className="w-4 h-4 text-yellow-600" />
            {coins}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">玩遊戲贏取金幣 → 解鎖稀有頭像 → 點「裝備」套用</p>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {SHOP_AVATARS.map((a, i) => {
            const isOwned = owned.includes(a.emoji);
            const canAfford = coins >= a.price;
            return (
              <motion.div
                key={a.emoji}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`border-brutal shadow-brutal rounded-2xl p-3 bg-gradient-to-br ${RARITY_STYLE[a.rarity]}`}
              >
                <div className="text-5xl text-center my-2">{a.emoji}</div>
                <div className="text-[10px] uppercase tracking-wide text-center font-bold opacity-70">{a.rarity}</div>
                {isOwned ? (
                  <button
                    onClick={() => equip(a.emoji)}
                    className="mt-2 w-full border-2 border-foreground rounded-lg py-1.5 text-xs font-bold bg-foreground text-background hover:opacity-80"
                  >
                    裝備
                  </button>
                ) : (
                  <button
                    onClick={() => purchase(a.emoji)}
                    disabled={!canAfford || busy === a.emoji}
                    className="mt-2 w-full border-2 border-foreground rounded-lg py-1.5 text-xs font-bold bg-card disabled:opacity-50 hover:translate-y-0.5"
                  >
                    {busy === a.emoji ? "…" : `${a.price} 🪙`}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          想多賺金幣？前往
          <Link to="/games" className="underline font-bold mx-1">遊戲大廳</Link>
          或
          <Link to="/arcade" className="underline font-bold mx-1">單人街機</Link>
        </div>
      </div>
    </div>
  );
}