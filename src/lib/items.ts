import { getClientId } from "@/lib/game";
import {
  EMOTE_PACKS,
  FREE_EMOTES,
  BOOSTERS,
  emoteSku,
  type EmotePack,
  type Booster,
} from "@/lib/catalog";
import { walletState, buySku as buySkuFn, buyPack } from "@/lib/wallet.functions";

/**
 * All shop items are stored as prefixed strings in the `owned_avatars` table:
 *   - bare emoji like "🦄"        → avatar (legacy)
 *   - "emote:🎉"                  → in-game emote
 *   - "boost:doubler"             → permanent 2x coin booster
 *
 * Reads/writes go through server functions; the table itself is not client-accessible.
 */

export { EMOTE_PACKS, FREE_EMOTES, BOOSTERS };
export type { EmotePack, Booster };

export async function getOwnedSkus(): Promise<Set<string>> {
  const id = getClientId();
  if (!id) return new Set();
  const w = await walletState({ data: { clientId: id } });
  return new Set(w.skus);
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

/** Generic single-SKU purchase against the wallet (price validated server-side). */
export async function buySku(sku: string, _price?: number): Promise<{ ok: boolean; reason?: string; coins?: number }> {
  const id = getClientId();
  if (!id) return { ok: false, reason: "尚未初始化" };
  return await buySkuFn({ data: { clientId: id, sku } });
}

export async function buyEmotePack(pack: EmotePack) {
  const id = getClientId();
  if (!id) return { ok: false, reason: "尚未初始化" } as const;
  return await buyPack({ data: { clientId: id, packId: pack.id } });
}

export function isEmotePackOwned(pack: EmotePack, skus: Set<string>) {
  return pack.emotes.every((e) => skus.has(emoteSku(e)));
}
