import { getClientId } from "@/lib/game";
import { SHOP_AVATARS, FREE_AVATARS, type ShopAvatar } from "@/lib/catalog";
import { walletState, awardCoins as awardCoinsFn, buySku } from "@/lib/wallet.functions";

export { SHOP_AVATARS, FREE_AVATARS };
export type { ShopAvatar };

/** Coins + gems for this browser (server-authoritative). */
export async function getWallet(): Promise<{ coins: number; gems: number }> {
  const id = getClientId();
  if (!id) return { coins: 0, gems: 0 };
  const w = await walletState({ data: { clientId: id } });
  return { coins: w.coins, gems: w.gems };
}

export async function getGems(): Promise<number> {
  return (await getWallet()).gems;
}

export async function addCoins(delta: number) {
  const id = getClientId();
  if (!id) return 0;
  const { coins } = await awardCoinsFn({ data: { clientId: id, delta } });
  return coins;
}

/** Credit coins; the permanent 2x doubler is applied server-side when owned. */
export async function awardCoins(delta: number): Promise<{ coins: number; doubled: boolean; gained: number }> {
  const id = getClientId();
  if (!id) return { coins: 0, doubled: false, gained: 0 };
  return await awardCoinsFn({ data: { clientId: id, delta } });
}

export async function getOwned(): Promise<string[]> {
  const id = getClientId();
  if (!id) return FREE_AVATARS;
  const w = await walletState({ data: { clientId: id } });
  return [...FREE_AVATARS, ...w.skus];
}

export async function buyAvatar(emoji: string): Promise<{ ok: boolean; reason?: string; coins?: number }> {
  const id = getClientId();
  if (!id) return { ok: false, reason: "尚未初始化" };
  return await buySku({ data: { clientId: id, sku: emoji } });
}
