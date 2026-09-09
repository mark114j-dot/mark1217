import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requestGamePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { game_id: string; message: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: game, error: gameError } = await context.supabase
      .from("games")
      .select("id,name,created_by,status")
      .eq("id", data.game_id)
      .maybeSingle();
    if (gameError) throw new Error(gameError.message);
    if (!game || game.created_by !== context.userId) throw new Error("只能推廣自己製作的遊戲");
    if (game.status !== "published") throw new Error("遊戲尚未發布");

    const { data: existing } = await context.supabase
      .from("game_promotion_requests")
      .select("id")
      .eq("game_id", data.game_id)
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) throw new Error("這款遊戲已經有一筆待審核的推廣申請");

    const { data: request, error } = await context.supabase
      .from("game_promotion_requests")
      .insert({ game_id: data.game_id, user_id: context.userId, message: data.message.trim().slice(0, 200) || null })
      .select("id,status")
      .single();
    if (error) throw new Error(error.message);
    return request;
  });
