import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlayerGameInput = {
  name: string;
  html_content: string;
};

export const createPlayerGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PlayerGameInput) => d)
  .handler(async ({ data, context }) => {
    const { data: game, error } = await context.supabase.rpc("create_player_game", {
      _name: data.name,
      _html_content: data.html_content,
    });
    if (error) throw new Error(error.message);
    const created = Array.isArray(game) ? game[0] : game;
    if (!created) throw new Error("遊戲發布失敗");
    return created as { id: string; slug: string; name: string; status: string };
  });
