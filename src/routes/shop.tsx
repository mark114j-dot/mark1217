import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Coins } from "lucide-react";
import { toast } from "sonner";
import { SHOP_AVATARS, getWallet, getOwned, buyAvatar, FREE_AVATARS } from "@/lib/wallet";
import { saveAvatar, getClientId } from "@/lib/game";
import { sfx } from "@/lib/sfx";
import { useServerFn } from "@tanstack/react-start";
import { buyEmote as buyGifEmote } from "@/lib/emotes.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  EMOTE_PACKS,
  BOOSTERS,
  getOwnedSkus,
  buyEmotePack,
  buySku,
  isEmotePackOwned,
} from "@/lib/items";

export const Route = createFileRoute("/shop")({
  component: Shop,
  head: () => ({
    meta: [
      { title: "商店 — 用金幣與寶石解鎖頭像與 GIF 表情｜畫聊 Doodle" },
      { name: "description", content: "在畫聊 Doodle 商店用遊戲中賺到的金幣解鎖稀有頭像，或用寶石購買 GIF 表情包與加成道具，在對戰時展現個人風格。" },
      { property: "og:title", content: "商店 — 解鎖頭像、GIF 表情與加成道具" },
      { property: "og:description", content: "用金幣解鎖稀有頭像，用寶石購買 GIF 表情包與加成道具，讓你的對戰更有個性。" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://mark1217.lovable.app/shop" },
    ],
    links: [{ rel: "canonical", href: "https://mark1217.lovable.app/shop" }],
  }),
});

const RARITY_STYLE: Record<string, string> = {
  common: "from-slate-200 to-slate-100 border-slate-400",
  rare: "from-sky-200 to-sky-100 border-sky-500",
  epic: "from-violet-200 to-fuchsia-100 border-violet-500",
  legendary: "from-amber-200 to-orange-100 border-amber-500",
};

type Tab = "avatars" | "emotes" | "boosters" | "gifs";

type GifEmote = {
  id: string; name: string; gif_url: string; gem_price: number;
  display_mode: "fullscreen" | "bar"; active: boolean;
};

function Shop() {
  const { user } = useAuth();
  const buyGifFn = useServerFn(buyGifEmote);
  const [coins, setCoins] = useState(0);
  const [gems, setGems] = useState(0);
  const [owned, setOwned] = useState<string[]>(FREE_AVATARS);
  const [busy, setBusy] = useState<string | null>(null);
  const [skus, setSkus] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("avatars");
  const [gifs, setGifs] = useState<GifEmote[]>([]);
  const [ownedGifIds, setOwnedGifIds] = useState<Set<string>>(new Set());

  async function refresh() {
    const w = await getWallet();
    setCoins(w.coins);
    setGems(w.gems);
    setOwned(await getOwned());
    setSkus(await getOwnedSkus());
    // shop gifs (public read)
    const { data: gRows } = await supabase.from("shop_emotes")
      .select("id,name,gif_url,gem_price,display_mode,active")
      .eq("active", true).order("gem_price", { ascending: true });
    setGifs((gRows ?? []) as GifEmote[]);
    if (user) {
      const { data: oRows } = await supabase.from("owned_emotes").select("emote_id").eq("user_id", user.id);
      setOwnedGifIds(new Set((oRows ?? []).map((r: any) => r.emote_id)));
    } else {
      setOwnedGifIds(new Set());
    }
  }

  useEffect(() => {
    refresh();
  }, [user]);

  async function purchaseGif(g: GifEmote) {
    if (!user) { toast.error("請先登入才能購買 GIF 表情"); return; }
    if (gems < g.gem_price) { toast.error("寶石不足"); return; }
    setBusy(`gif:${g.id}`);
    try {
      await buyGifFn({ data: { emoteId: g.id, clientId: getClientId() } });
      sfx.coin();
      toast.success(`已擁有「${g.name}」！遊戲中可從表情按鈕送出`);
      await refresh();
    } catch (e: any) { sfx.lose(); toast.error(e.message ?? "購買失敗"); }
    finally { setBusy(null); }
  }

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

  async function purchasePack(packId: string) {
    const pack = EMOTE_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    setBusy(`pack:${packId}`);
    const res = await buyEmotePack(pack);
    setBusy(null);
    if (!res.ok) { sfx.lose(); toast.error(res.reason ?? "購買失敗"); return; }
    sfx.coin();
    toast.success(`解鎖「${pack.name}」表情組！遊戲中按右下角 😀 送出`);
    await refresh();
  }

  async function purchaseBooster(sku: string, price: number, name: string) {
    setBusy(sku);
    const res = await buySku(sku, price);
    setBusy(null);
    if (!res.ok) { sfx.lose(); toast.error(res.reason ?? "購買失敗"); return; }
    sfx.level();
    toast.success(`啟用「${name}」！`);
    await refresh();
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="border-brutal shadow-brutal-sm rounded-lg p-2 bg-card hover:translate-y-0.5 hover:shadow-none transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-black">🛍️ 頭像商店</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1 border-brutal shadow-brutal-sm bg-yellow-100 px-3 py-1.5 rounded-xl font-mono font-bold">
              <Coins className="w-4 h-4 text-yellow-600" />
              {coins}
            </div>
            <div className="flex items-center gap-1 border-brutal shadow-brutal-sm bg-cyan-100 px-3 py-1.5 rounded-xl font-mono font-bold">
              💎 {gems}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">玩遊戲贏金幣 → 解鎖頭像 / 表情 / 加倍器 → 戰場上嗆翻對手</p>

        <div className="flex gap-2 mb-4 flex-wrap">
          {([
            ["avatars", "🐱 頭像"],
            ["emotes", "😀 表情"],
            ["gifs", "🖼️ GIF 表情"],
            ["boosters", "💰 加倍 / 道具"],
          ] as [Tab, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`border-brutal shadow-brutal-sm rounded-xl px-4 py-1.5 font-bold text-sm transition ${tab === k ? "bg-primary text-primary-foreground" : "bg-card hover:translate-y-0.5 hover:shadow-none"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "gifs" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gifs.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-8">尚未上架任何 GIF 表情</div>
            )}
            {gifs.map((g) => {
              const owns = ownedGifIds.has(g.id);
              const canAfford = gems >= g.gem_price;
              return (
                <div key={g.id} className="border-brutal shadow-brutal rounded-2xl bg-card overflow-hidden">
                  <div className="aspect-square bg-black grid place-items-center">
                    <img src={g.gif_url} alt={g.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-2">
                    <div className="font-bold text-sm truncate">{g.name}</div>
                    <div className="text-[10px] text-muted-foreground mb-1">{g.display_mode === "fullscreen" ? "全螢幕蓋版" : "底部小條"}</div>
                    <button
                      onClick={() => purchaseGif(g)}
                      disabled={owns || !canAfford || busy === `gif:${g.id}`}
                      className="w-full border-2 border-foreground rounded-lg py-1.5 text-xs font-bold bg-primary text-primary-foreground disabled:opacity-50 hover:translate-y-0.5"
                    >
                      {owns ? "✓ 已擁有" : busy === `gif:${g.id}` ? "…" : `${g.gem_price} 💎`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "avatars" && (
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
        )}

        {tab === "emotes" && (
          <div className="grid sm:grid-cols-2 gap-3">
            {EMOTE_PACKS.map((pack) => {
              const ownedAll = isEmotePackOwned(pack, skus);
              const owns = pack.emotes.filter((e) => skus.has(`emote:${e}`)).length;
              const canAfford = coins >= pack.price;
              return (
                <div key={pack.id} className="border-brutal shadow-brutal rounded-2xl p-4 bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-display font-black text-lg flex items-center gap-2">
                      <span className="text-3xl">{pack.emoji}</span>{pack.name}
                    </div>
                    <span className="text-xs text-muted-foreground">{owns}/{pack.emotes.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {pack.emotes.map((e) => (
                      <span key={e} className={`text-2xl px-1.5 py-0.5 rounded-md border-2 ${skus.has(`emote:${e}`) ? "border-accent bg-accent/30" : "border-foreground/20 bg-card opacity-80"}`}>{e}</span>
                    ))}
                  </div>
                  <button
                    onClick={() => purchasePack(pack.id)}
                    disabled={ownedAll || !canAfford || busy === `pack:${pack.id}`}
                    className="w-full border-2 border-foreground rounded-lg py-2 text-sm font-bold bg-primary text-primary-foreground disabled:opacity-50 hover:translate-y-0.5"
                  >
                    {ownedAll ? "✓ 已全部解鎖" : busy === `pack:${pack.id}` ? "…" : `解鎖整組 ${pack.price} 🪙`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "boosters" && (
          <div className="grid sm:grid-cols-2 gap-3">
            {BOOSTERS.map((b) => {
              const owned = skus.has(b.sku);
              const canAfford = coins >= b.price;
              return (
                <div key={b.id} className="border-brutal shadow-brutal rounded-2xl p-4 bg-gradient-to-br from-yellow-100 to-amber-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-5xl">{b.emoji}</div>
                    <div>
                      <div className="font-display font-black text-lg">{b.name}</div>
                      <div className="text-xs text-muted-foreground">{b.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => purchaseBooster(b.sku, b.price, b.name)}
                    disabled={owned || !canAfford || busy === b.sku}
                    className="w-full border-2 border-foreground rounded-lg py-2 text-sm font-bold bg-foreground text-background disabled:opacity-50 hover:translate-y-0.5"
                  >
                    {owned ? "✓ 已啟用" : busy === b.sku ? "…" : `購買 ${b.price} 🪙`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

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