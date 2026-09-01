import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ShopEmote = {
  id: string;
  name: string;
  gif_url: string;
  gem_price: number;
  display_mode: "fullscreen" | "bar";
  active: boolean;
};

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("需要管理員權限");
}

export const listEmotesAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("shop_emotes").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ShopEmote[];
  });

export const upsertEmote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<ShopEmote> & { id?: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const payload: any = {
      name: (data.name ?? "").trim(),
      gif_url: (data.gif_url ?? "").trim(),
      gem_price: Math.max(0, Math.floor(Number(data.gem_price ?? 0))),
      display_mode: data.display_mode === "bar" ? "bar" : "fullscreen",
      active: data.active ?? true,
    };
    if (!payload.name || !payload.gif_url) throw new Error("名稱與 GIF URL 必填");
    if (!/^https?:\/\//i.test(payload.gif_url) && !payload.gif_url.startsWith("data:")) {
      throw new Error("GIF URL 需為 http(s) 或 data:");
    }
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("shop_emotes").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    payload.created_by = context.userId;
    const { data: row, error } = await context.supabase
      .from("shop_emotes").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteEmote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("shop_emotes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// User buys an emote: RPC spend_gems then insert owned_emotes
export const buyEmote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { emoteId: string; clientId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: emote, error: e1 } = await context.supabase
      .from("shop_emotes").select("id,gem_price,active").eq("id", data.emoteId).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!emote || !emote.active) throw new Error("此表情已下架");
    const { data: owned } = await context.supabase
      .from("owned_emotes").select("id").eq("user_id", context.userId).eq("emote_id", data.emoteId).maybeSingle();
    if (owned) throw new Error("已擁有此表情");
    // Spend gems via SECURITY DEFINER rpc, keyed on the anonymous wallet client_id
    if (emote.gem_price > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: eSpend } = await supabaseAdmin.rpc("spend_gems", {
        _client_id: data.clientId, _amount: emote.gem_price,
      });
      if (eSpend) throw new Error(eSpend.message);
    }
    const { error: eIns } = await context.supabase.from("owned_emotes").insert({
      user_id: context.userId, emote_id: data.emoteId, price_paid: emote.gem_price,
    });
    if (eIns) throw new Error(eIns.message);
    return { ok: true };
  });

// Admin grants gems for testing (kept tiny — used only by admin panel button)
export const adminAddGems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string; amount: number }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const amt = Math.max(1, Math.floor(data.amount));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: gems, error } = await supabaseAdmin.rpc("add_gems", {
      _client_id: data.clientId, _amount: amt,
    });
    if (error) throw new Error(error.message);
    return { gems };
  });