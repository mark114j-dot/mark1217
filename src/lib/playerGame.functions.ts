import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlayerGameInput = {
  name: string;
  html_content: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export const createPlayerGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PlayerGameInput) => d)
  .handler(async ({ data, context }) => {
    const name = String(data.name ?? "").trim().slice(0, 80);
    const html = String(data.html_content ?? "").trim();
    if (!name) throw new Error("請輸入遊戲名稱");
    if (!html) throw new Error("請貼上遊戲程式碼");
    if (html.length > 500_000) throw new Error("遊戲程式碼不能超過 500 KB");

    const baseSlug = slugify(name) || `game-${Date.now()}`;
    let slug = baseSlug;
    for (let i = 2; i <= 100; i += 1) {
      const { data: existing, error } = await context.supabase
        .from("games").select("id").eq("slug", slug).maybeSingle();
      if (error) throw new Error(error.message);
      if (!existing) break;
      slug = `${baseSlug}-${i}`.slice(0, 60);
      if (i === 100) slug = `${baseSlug}-${Date.now()}`;
    }

    const { data: game, error } = await context.supabase
      .from("games")
      .insert({
        slug,
        name,
        emoji: "🎮",
        description: "玩家手動發布的遊戲",
        category: "misc",
        primitive: "custom",
        spec: { source: "manual" },
        min_players: 1,
        max_players: 1,
        html_content: html,
        offline_ok: false,
        status: "published",
        version: 1,
        created_by: context.userId,
      })
      .select("id,slug,name,status")
      .single();
    if (error) throw new Error(error.message);
    return game as { id: string; slug: string; name: string; status: string };
  });
