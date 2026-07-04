import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AnnouncementKind = "update" | "event" | "maintenance" | "urgent";
export type Announcement = {
  id: string;
  kind: AnnouncementKind;
  title: string;
  body: string;
  active: boolean;
  block_play: boolean;
  require_typing: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("需要管理員權限");
}

export const listAnnouncementsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("announcements").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Announcement[];
  });

export const upsertAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<Announcement> & { id?: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const payload: any = {
      kind: data.kind ?? "update",
      title: data.title ?? "",
      body: data.body ?? "",
      active: data.active ?? true,
      block_play: data.block_play ?? false,
      require_typing: data.require_typing ?? false,
    };
    if (!payload.title.trim() || !payload.body.trim()) throw new Error("標題與內容不可空");
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("announcements").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return row;
    }
    payload.created_by = context.userId;
    const { data: row, error } = await context.supabase
      .from("announcements").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });