import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function isAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  return !!data;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

type ManualGameInput = {
  name: string;
  html_content: string;
};

export const createManualGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ManualGameInput) => d)
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("需要管理員權限");

    const name = data.name.trim();
    const html = data.html_content.trim();
    if (!name) throw new Error("請輸入遊戲名稱");
    if (!html) throw new Error("請貼上遊戲程式碼");
    if (html.length > 500_000) throw new Error("遊戲程式碼不能超過 500 KB");

    const baseSlug = slugify(name) || `game-${Date.now()}`;
    let slug = baseSlug;
    for (let i = 2; i <= 100; i += 1) {
      const { data: existing, error } = await context.supabase
        .from("games")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!existing) break;
      slug = `${baseSlug}-${i}`.slice(0, 60);
      if (i === 100) throw new Error("遊戲網址代稱已經太多重複，請換一個遊戲名稱");
    }

    const { data: game, error } = await context.supabase
      .from("games")
      .insert({
        slug,
        name,
        emoji: "🎮",
        description: "管理員手動發布的遊戲",
        category: "misc",
        primitive: "custom",
        spec: { source: "manual" },
        min_players: 1,
        max_players: 1,
        html_content: html,
        play_url: null,
        cover_image_url: null,
        instructions: null,
        offline_ok: false,
        status: "published",
        version: 1,
        created_by: context.userId,
      })
      .select("id,slug,name,status")
      .single();

    if (error) throw new Error(error.message);
    return game;
  });
