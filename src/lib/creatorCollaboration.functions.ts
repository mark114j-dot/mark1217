import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyCreatorGames = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("list_my_creator_games");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createCreatorInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { game_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: token, error } = await context.supabase.rpc("create_game_creator_invitation", { _game_id: data.game_id });
    if (error) throw new Error(error.message);
    return String(token);
  });

export const acceptCreatorInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("accept_game_creator_invitation", { _token: data.token });
    if (error) throw new Error(error.message);
    const row = Array.isArray(result) ? result[0] : result;
    if (!row) throw new Error("接受邀請失敗");
    return row as { game_id: string; role: string };
  });

export const getCollaboratorGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { game_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("get_collaborator_game", { _game_id: data.game_id });
    if (error) throw new Error(error.message);
    const row = Array.isArray(result) ? result[0] : result;
    if (!row) throw new Error("找不到遊戲");
    return row as { id: string; slug: string; name: string; html_content: string; version: number };
  });

export const updateCollaboratorGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { game_id: string; html_content: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: ok, error } = await context.supabase.rpc("update_collaborator_game", {
      _game_id: data.game_id,
      _html_content: data.html_content,
    });
    if (error) throw new Error(error.message);
    return !!ok;
  });
