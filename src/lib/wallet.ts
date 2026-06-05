import { supabase } from "@/integrations/supabase/client";
import { getClientId } from "@/lib/game";

export type ShopAvatar = { emoji: string; price: number; rarity: "common" | "rare" | "epic" | "legendary" };

export const SHOP_AVATARS: ShopAvatar[] = [
  { emoji: "🦊", price: 50, rarity: "common" },
  { emoji: "🐼", price: 50, rarity: "common" },
  { emoji: "🦁", price: 80, rarity: "common" },
  { emoji: "🐲", price: 150, rarity: "rare" },
  { emoji: "🦄", price: 200, rarity: "rare" },
  { emoji: "🦖", price: 200, rarity: "rare" },
  { emoji: "🧙", price: 300, rarity: "epic" },
  { emoji: "🦸", price: 300, rarity: "epic" },
  { emoji: "🥷", price: 300, rarity: "epic" },
  { emoji: "🧛", price: 400, rarity: "epic" },
  { emoji: "👽", price: 500, rarity: "epic" },
  { emoji: "🤖", price: 500, rarity: "epic" },
  { emoji: "👻", price: 600, rarity: "legendary" },
  { emoji: "🎃", price: 600, rarity: "legendary" },
  { emoji: "🐉", price: 800, rarity: "legendary" },
  { emoji: "👑", price: 1000, rarity: "legendary" },
  { emoji: "💎", price: 1200, rarity: "legendary" },
  { emoji: "🔥", price: 1500, rarity: "legendary" },
];

export const FREE_AVATARS = ["🐱", "🐶", "🐸", "🐵", "🐧"];

export async function getWallet(): Promise<{ coins: number }> {
  const id = getClientId();
  if (!id) return { coins: 0 };
  const { data } = await supabase.from("wallets").select("coins").eq("client_id", id).maybeSingle();
  if (!data) {
    await supabase.from("wallets").insert({ client_id: id, coins: 100 });
    return { coins: 100 };
  }
  return { coins: data.coins };
}

export async function addCoins(delta: number) {
  const id = getClientId();
  if (!id) return 0;
  const { coins } = await getWallet();
  const next = Math.max(0, coins + delta);
  await supabase.from("wallets").update({ coins: next }).eq("client_id", id);
  return next;
}

export async function getOwned(): Promise<string[]> {
  const id = getClientId();
  if (!id) return FREE_AVATARS;
  const { data } = await supabase.from("owned_avatars").select("avatar").eq("client_id", id);
  return [...FREE_AVATARS, ...(data ?? []).map((r) => r.avatar)];
}

export async function buyAvatar(emoji: string): Promise<{ ok: boolean; reason?: string; coins?: number }> {
  const item = SHOP_AVATARS.find((a) => a.emoji === emoji);
  if (!item) return { ok: false, reason: "找不到此頭像" };
  const id = getClientId();
  if (!id) return { ok: false, reason: "尚未初始化" };
  const owned = await getOwned();
  if (owned.includes(emoji)) return { ok: false, reason: "已擁有" };
  const { coins } = await getWallet();
  if (coins < item.price) return { ok: false, reason: "金幣不足" };
  const next = coins - item.price;
  const { error: upErr } = await supabase.from("wallets").update({ coins: next }).eq("client_id", id);
  if (upErr) return { ok: false, reason: upErr.message };
  const { error: insErr } = await supabase.from("owned_avatars").insert({ client_id: id, avatar: emoji });
  if (insErr) return { ok: false, reason: insErr.message };
  return { ok: true, coins: next };
}