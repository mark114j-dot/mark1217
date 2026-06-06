import { supabase } from "@/integrations/supabase/client";
import { getClientId } from "@/lib/game";

/**
 * All shop items are stored as prefixed strings in the `owned_avatars` table:
 *   - bare emoji like "🦄"        → avatar (legacy)
 *   - "emote:🎉"                  → in-game emote
 *   - "boost:doubler"             → permanent 2x coin booster
 */

export type EmotePack = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  emotes: string[];
};

export const EMOTE_PACKS: EmotePack[] = [
  { id: "basic", name: "經典表情", emoji: "😀", price: 80, emotes: ["😀", "😂", "😭", "😡", "👍", "👎"] },
  { id: "party", name: "派對狂歡", emoji: "🎉", price: 150, emotes: ["🎉", "🥳", "🍾", "🎊", "🪩", "✨"] },
  { id: "trashtalk", name: "嘲諷大全", emoji: "🤡", price: 200, emotes: ["🤡", "🥱", "💀", "🤏", "🫵", "😏"] },
  { id: "love", name: "可愛友善", emoji: "💖", price: 200, emotes: ["💖", "🥰", "😘", "🤗", "🫶", "🌸"] },
  { id: "epic", name: "傳說特效", emoji: "🐉", price: 500, emotes: ["🐉", "🔥", "⚡", "💎", "👑", "🌈"] },
];

// Always-free starter emotes so everyone can react out of the box.
export const FREE_EMOTES = ["👋", "❓", "😂", "👍"];

export type Booster = { id: string; name: string; emoji: string; desc: string; price: number; sku: string };

export const BOOSTERS: Booster[] = [
  { id: "doubler", name: "金幣加倍器", emoji: "💰", desc: "永久 2x 賺取金幣", price: 1500, sku: "boost:doubler" },
];

function emoteSku(e: string) { return `emote:${e}`; }

export async function getOwnedSkus(): Promise<Set<string>> {
  const id = getClientId();
  if (!id) return new Set();
  const { data } = await supabase.from("owned_avatars").select("avatar").eq("client_id", id);
  return new Set((data ?? []).map((r) => r.avatar));
}

export async function getOwnedEmotes(): Promise<string[]> {
  const skus = await getOwnedSkus();
  const out = new Set<string>(FREE_EMOTES);
  for (const s of skus) if (s.startsWith("emote:")) out.add(s.slice(6));
  return [...out];
}

export async function hasBooster(sku: string): Promise<boolean> {
  const skus = await getOwnedSkus();
  return skus.has(sku);
}

/** Generic single-SKU purchase against the wallet. */
export async function buySku(sku: string, price: number): Promise<{ ok: boolean; reason?: string; coins?: number }> {
  const id = getClientId();
  if (!id) return { ok: false, reason: "尚未初始化" };
  const skus = await getOwnedSkus();
  if (skus.has(sku)) return { ok: false, reason: "已擁有" };
  const { data: w } = await supabase.from("wallets").select("coins").eq("client_id", id).maybeSingle();
  const coins = w?.coins ?? 0;
  if (coins < price) return { ok: false, reason: "金幣不足" };
  const next = coins - price;
  const { error: upErr } = await supabase.from("wallets").update({ coins: next }).eq("client_id", id);
  if (upErr) return { ok: false, reason: upErr.message };
  const { error: insErr } = await supabase.from("owned_avatars").insert({ client_id: id, avatar: sku });
  if (insErr) return { ok: false, reason: insErr.message };
  return { ok: true, coins: next };
}

export async function buyEmotePack(pack: EmotePack) {
  const id = getClientId();
  if (!id) return { ok: false, reason: "尚未初始化" } as const;
  const skus = await getOwnedSkus();
  const missing = pack.emotes.map(emoteSku).filter((s) => !skus.has(s));
  if (!missing.length) return { ok: false, reason: "已擁有整組" } as const;
  const { data: w } = await supabase.from("wallets").select("coins").eq("client_id", id).maybeSingle();
  const coins = w?.coins ?? 0;
  if (coins < pack.price) return { ok: false, reason: "金幣不足" } as const;
  const next = coins - pack.price;
  const { error: upErr } = await supabase.from("wallets").update({ coins: next }).eq("client_id", id);
  if (upErr) return { ok: false, reason: upErr.message } as const;
  const rows = missing.map((sku) => ({ client_id: id, avatar: sku }));
  const { error: insErr } = await supabase.from("owned_avatars").insert(rows);
  if (insErr) return { ok: false, reason: insErr.message } as const;
  return { ok: true, coins: next } as const;
}

export function isEmotePackOwned(pack: EmotePack, skus: Set<string>) {
  return pack.emotes.every((e) => skus.has(emoteSku(e)));
}