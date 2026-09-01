import { createServerFn } from "@tanstack/react-start";
import {
  BOOSTERS,
  DOUBLER_SKU,
  EMOTE_PACKS,
  SHOP_AVATARS,
  emoteSku,
  priceForSku,
} from "@/lib/catalog";

/**
 * Wallet / inventory access runs server-side only.
 * The anonymous `clientId` is a private random UUID held by the browser and acts as
 * the bearer of the wallet — the underlying tables are locked down by RLS so no one
 * can enumerate, read or modify other players' balances or inventories.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertClientId(id: unknown): string {
  if (typeof id !== "string" || !UUID_RE.test(id)) throw new Error("無效的用戶識別碼");
  return id;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function ensureWallet(db: any, clientId: string) {
  const { data } = await db.from("wallets").select("coins,gems").eq("client_id", clientId).maybeSingle();
  if (data) return { coins: data.coins as number, gems: data.gems as number };
  await db.from("wallets").insert({ client_id: clientId, coins: 100, gems: 0 });
  return { coins: 100, gems: 0 };
}

async function ownedSkus(db: any, clientId: string): Promise<string[]> {
  const { data } = await db.from("owned_avatars").select("avatar").eq("client_id", clientId);
  return (data ?? []).map((r: any) => r.avatar as string);
}

/** Balance + inventory for the calling browser. */
export const walletState = createServerFn({ method: "POST" })
  .inputValidator((d: { clientId: string }) => ({ clientId: assertClientId(d?.clientId) }))
  .handler(async ({ data }) => {
    const db = await admin();
    const w = await ensureWallet(db, data.clientId);
    return { ...w, skus: await ownedSkus(db, data.clientId) };
  });

/** Credit coins earned in game. Amount is clamped server-side; doubler applied server-side. */
export const awardCoins = createServerFn({ method: "POST" })
  .inputValidator((d: { clientId: string; delta: number }) => ({
    clientId: assertClientId(d?.clientId),
    delta: Math.trunc(Number(d?.delta) || 0),
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const w = await ensureWallet(db, data.clientId);
    const delta = Math.max(-5000, Math.min(2000, data.delta));
    let gained = delta;
    let doubled = false;
    if (delta > 0) {
      const skus = await ownedSkus(db, data.clientId);
      doubled = skus.includes(DOUBLER_SKU);
      if (doubled) gained = delta * 2;
    }
    const coins = Math.max(0, w.coins + gained);
    await db.from("wallets").update({ coins, updated_at: new Date().toISOString() }).eq("client_id", data.clientId);
    return { coins, gained, doubled };
  });

/** Buy one catalog SKU (avatar emoji or booster). Price is resolved server-side. */
export const buySku = createServerFn({ method: "POST" })
  .inputValidator((d: { clientId: string; sku: string }) => ({
    clientId: assertClientId(d?.clientId),
    sku: String(d?.sku ?? "").slice(0, 64),
  }))
  .handler(async ({ data }) => {
    const price = priceForSku(data.sku);
    if (price == null) return { ok: false as const, reason: "找不到此商品" };
    const db = await admin();
    const w = await ensureWallet(db, data.clientId);
    const skus = await ownedSkus(db, data.clientId);
    if (skus.includes(data.sku)) return { ok: false as const, reason: "已擁有" };
    if (w.coins < price) return { ok: false as const, reason: "金幣不足" };
    const coins = w.coins - price;
    const { error: upErr } = await db
      .from("wallets").update({ coins, updated_at: new Date().toISOString() }).eq("client_id", data.clientId);
    if (upErr) return { ok: false as const, reason: "扣款失敗" };
    const { error: insErr } = await db
      .from("owned_avatars").insert({ client_id: data.clientId, avatar: data.sku });
    if (insErr) return { ok: false as const, reason: "發放失敗" };
    return { ok: true as const, coins };
  });

/** Buy a whole emote pack. Price resolved server-side from the catalog. */
export const buyPack = createServerFn({ method: "POST" })
  .inputValidator((d: { clientId: string; packId: string }) => ({
    clientId: assertClientId(d?.clientId),
    packId: String(d?.packId ?? "").slice(0, 64),
  }))
  .handler(async ({ data }) => {
    const pack = EMOTE_PACKS.find((p) => p.id === data.packId);
    if (!pack) return { ok: false as const, reason: "找不到此組合" };
    const db = await admin();
    const w = await ensureWallet(db, data.clientId);
    const skus = new Set(await ownedSkus(db, data.clientId));
    const missing = pack.emotes.map(emoteSku).filter((s) => !skus.has(s));
    if (missing.length === 0) return { ok: false as const, reason: "已擁有整組" };
    if (w.coins < pack.price) return { ok: false as const, reason: "金幣不足" };
    const coins = w.coins - pack.price;
    const { error: upErr } = await db
      .from("wallets").update({ coins, updated_at: new Date().toISOString() }).eq("client_id", data.clientId);
    if (upErr) return { ok: false as const, reason: "扣款失敗" };
    const { error: insErr } = await db
      .from("owned_avatars").insert(missing.map((sku) => ({ client_id: data.clientId, avatar: sku })));
    if (insErr) return { ok: false as const, reason: "發放失敗" };
    return { ok: true as const, coins };
  });

export const CATALOG = { SHOP_AVATARS, BOOSTERS, EMOTE_PACKS };
