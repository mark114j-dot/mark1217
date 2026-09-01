// Shared shop catalog. Pure data — safe to import from both client and server code.
// Prices MUST be resolved from here on the server so clients cannot forge them.

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

export const DOUBLER_SKU = "boost:doubler";

export function emoteSku(e: string) {
  return `emote:${e}`;
}

/** Authoritative price lookup for a single SKU. Returns null for unknown SKUs. */
export function priceForSku(sku: string): number | null {
  const avatar = SHOP_AVATARS.find((a) => a.emoji === sku);
  if (avatar) return avatar.price;
  const booster = BOOSTERS.find((b) => b.sku === sku);
  if (booster) return booster.price;
  return null;
}
