import { createServerFn } from "@tanstack/react-start";

/** Bump a game's play counter. Runs server-side so the counter RPC isn't publicly callable. */
export const recordPlay = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) => ({ slug: String(d?.slug ?? "").slice(0, 120) }))
  .handler(async ({ data }) => {
    if (!data.slug) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("increment_game_play", { _slug: data.slug });
    return { ok: true };
  });
