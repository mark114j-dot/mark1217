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

export type ManualGameInput = {
  name: string;
  slug: string;
  emoji: string;
  description: string;
  category: string;
  cover_image_url: string;
  instructions: string;
  html_content: string;
  play_url: string;
  offline_ok: boolean;
  min_players: number;
  max_players: number;
};

export const createManualGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ManualGameInput) => d)
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("需要管理員權限");

    const name = data.name.trim();
    const slug = slugify(data.slug || name);
    const html = data.html_content.trim();
    const playUrl = data.play_url.trim();

    if (!name) throw new Error("請輸入遊戲名稱");
    if (!slug) throw new Error("請輸入有效的網址代稱");
    if (!html && !playUrl) throw new Error("請填寫 HTML 遊戲程式或遊戲網址其中一項");
    if (html.length > 500_000) throw new Error("HTML 遊戲程式不能超過 500 KB");
    if (data.min_players < 1 || data.max_players < data.min_players) {
      throw new Error("玩家人數設定不正確");
    }

    const { data: existing, error: existingError } = await context.supabase
      .from("games")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) throw new Error(`網址代稱「${slug}」已經存在，請換一個`);

    const { data: game, error } = await context.supabase
      .from("games")
      .insert({
        slug,
        name,
        emoji: data.emoji.trim() || "🎮",
        description: data.description.trim(),
        category: data.category.trim() || "misc",
        primitive: "custom",
        spec: {
          source: "manual",
          min_players: data.min_players,
          max_players: data.max_players,
        },
        min_players: data.min_players,
        max_players: data.max_players,
        html_content: html || null,
        play_url: playUrl || null,
        cover_image_url: data.cover_image_url.trim() || null,
        instructions: data.instructions.trim() || null,
        offline_ok: !!data.offline_ok,
        status: "draft",
        version: 1,
        created_by: context.userId,
      })
      .select("id,slug,name,status")
      .single();

    if (error) throw new Error(error.message);
    return game;
  });
