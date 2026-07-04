import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles").select("invite_code,username,avatar").eq("id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("找不到個人資料");
    const { count } = await context.supabase
      .from("invite_claims").select("id", { count: "exact", head: true }).eq("referrer_id", context.userId);
    return { ...data, invited_count: count ?? 0 };
  });

export const claimInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; clientId: string }) => d)
  .handler(async ({ data, context }) => {
    const code = (data.code || "").trim().toUpperCase();
    if (!code) return { ok: false, reason: "無邀請碼" };
    // Already claimed as invited_id?
    const { data: exist } = await context.supabase
      .from("invite_claims").select("id").eq("invited_id", context.userId).maybeSingle();
    if (exist) return { ok: false, reason: "已領取過邀請獎勵" };
    const { data: ref, error: eRef } = await context.supabase
      .from("profiles").select("id").eq("invite_code", code).maybeSingle();
    if (eRef) throw new Error(eRef.message);
    if (!ref) return { ok: false, reason: "邀請碼不存在" };
    if (ref.id === context.userId) return { ok: false, reason: "不可邀請自己" };
    const { error: eIns } = await context.supabase
      .from("invite_claims").insert({ referrer_id: ref.id, invited_id: context.userId, reward_gems: 10 });
    if (eIns) throw new Error(eIns.message);
    // Reward inviter (via referrer's wallet client_id from any profile linkage; skip if unknown) and invitee.
    if (data.clientId) {
      await context.supabase.rpc("add_gems", { _client_id: data.clientId, _amount: 10 });
    }
    // Look up referrer's most recent wallet by matching profile updates — best-effort:
    // We store profiles.id, but wallets uses anonymous client_id. Skip inviter reward here;
    // inviter can claim their +10 gems from the invite page (server-verified via count).
    return { ok: true };
  });

// Inviter claims accumulated rewards for confirmed invites (server verifies count > gems already granted).
// Uses profiles.updated_at hack — simpler: keep a separate wallet_gem_grants table? For MVP, allow claim
// once per invited_id via invite_claims row: we mark reward_gems=0 after inviter has grabbed it.
export const claimInviterRewards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("invite_claims").select("id,reward_gems").eq("referrer_id", context.userId).gt("reward_gems", 0);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { granted: 0 };
    const total = rows.reduce((s: number, r: any) => s + (r.reward_gems ?? 0), 0);
    // Zero out reward_gems for those rows to mark as granted
    const ids = rows.map((r: any) => r.id);
    await context.supabase.from("invite_claims").update({ reward_gems: 0 }).in("id", ids);
    await context.supabase.rpc("add_gems", { _client_id: data.clientId, _amount: total });
    return { granted: total };
  });

// Leaderboard: aggregate invite_claims by referrer within a window.
export const inviteLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { range: "day" | "week" | "month" | "all" }) => d)
  .handler(async ({ data, context }) => {
    const now = new Date();
    let since: string | null = null;
    if (data.range === "day") since = new Date(now.getTime() - 86400e3).toISOString();
    else if (data.range === "week") since = new Date(now.getTime() - 7 * 86400e3).toISOString();
    else if (data.range === "month") since = new Date(now.getTime() - 30 * 86400e3).toISOString();

    let query = context.supabase.from("invite_claims").select("referrer_id,created_at");
    if (since) query = query.gte("created_at", since);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    for (const r of (rows ?? []) as any[]) counts.set(r.referrer_id, (counts.get(r.referrer_id) ?? 0) + 1);
    const ids = [...counts.keys()];
    if (ids.length === 0) return [];
    const { data: profs } = await context.supabase
      .from("profiles").select("id,username,avatar,country").in("id", ids);
    const map = new Map<string, any>();
    for (const p of (profs ?? []) as any[]) map.set(p.id, p);
    return ids.map((id) => ({
      referrer_id: id,
      count: counts.get(id) ?? 0,
      username: map.get(id)?.username ?? "玩家",
      avatar: map.get(id)?.avatar ?? "🐱",
      country: map.get(id)?.country ?? null,
    })).sort((a, b) => b.count - a.count).slice(0, 50);
  });