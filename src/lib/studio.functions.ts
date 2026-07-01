import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StudioMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
  images?: string[];
};

export type StudioDraftSpec = {
  name?: string;
  emoji?: string;
  category?: string;
  primitive?: string;
  description?: string;
  min_players?: number;
  max_players?: number;
  needs_ai?: boolean;
  needs_matchmaking?: boolean;
  needs_leaderboard?: boolean;
  needs_timer?: boolean;
  timer_seconds?: number;
  win_condition?: string;
  lose_condition?: string;
  rules?: string[];
  ui?: string[];
  levels?: number;
  extras?: Record<string, unknown>;
};

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("需要管理員權限");
}

export const listSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("studio_sessions")
      .select("id,title,folder,progress,game_id,updated_at,created_at,draft_spec")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: row, error } = await context.supabase
      .from("studio_sessions").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title?: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: row, error } = await context.supabase
      .from("studio_sessions")
      .insert({
        owner_id: context.userId,
        title: data.title || "新遊戲構想",
        folder: "draft",
        messages: [],
        draft_spec: {},
        progress: 0,
      })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    title?: string;
    folder?: string;
    messages?: StudioMessage[];
    draft_spec?: StudioDraftSpec;
    progress?: number;
  }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const patch: any = {};
    for (const k of ["title", "folder", "messages", "draft_spec", "progress"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    const { data: row, error } = await context.supabase
      .from("studio_sessions").update(patch).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("studio_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: src, error: e1 } = await context.supabase
      .from("studio_sessions").select("*").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    const { data: row, error } = await context.supabase
      .from("studio_sessions")
      .insert({
        owner_id: context.userId,
        title: (src.title || "未命名") + " (副本)",
        folder: "draft",
        messages: src.messages,
        draft_spec: src.draft_spec,
        progress: src.progress,
      })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

function slugify(s: string) {
  return (s || "game")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `game-${Date.now()}`;
}

export const publishSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: s, error: e1 } = await context.supabase
      .from("studio_sessions").select("*").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    const spec = (s.draft_spec ?? {}) as StudioDraftSpec;
    if (!spec.name) throw new Error("尚未完成基本設定：缺少遊戲名稱");

    let gameId = s.game_id;
    if (gameId) {
      const { error: eu } = await context.supabase
        .from("games").update({
          name: spec.name, emoji: spec.emoji ?? "🎮",
          description: spec.description ?? "",
          category: spec.category ?? "misc",
          primitive: spec.primitive ?? "custom",
          spec: spec as any, min_players: spec.min_players ?? 1,
          max_players: spec.max_players ?? 4,
          status: "published",
        }).eq("id", gameId);
      if (eu) throw new Error(eu.message);
    } else {
      const { data: g, error: eg } = await context.supabase
        .from("games").insert({
          slug: slugify(spec.name) + "-" + Math.random().toString(36).slice(2, 6),
          name: spec.name, emoji: spec.emoji ?? "🎮",
          description: spec.description ?? "",
          category: spec.category ?? "misc",
          primitive: spec.primitive ?? "custom",
          spec: spec as any, min_players: spec.min_players ?? 1,
          max_players: spec.max_players ?? 4,
          status: "published", version: 1,
          created_by: context.userId,
        }).select().single();
      if (eg) throw new Error(eg.message);
      gameId = g.id;
    }

    const { data: vRows } = await context.supabase
      .from("game_versions").select("version").eq("game_id", gameId)
      .order("version", { ascending: false }).limit(1);
    const nextV = (vRows?.[0]?.version ?? 0) + 1;
    await context.supabase.from("game_versions").insert({
      game_id: gameId, version: nextV, spec: spec as any, note: "Studio 發布",
      created_by: context.userId,
    });

    await context.supabase.from("studio_sessions")
      .update({ game_id: gameId, folder: "published" }).eq("id", data.id);
    return { gameId, version: nextV };
  });

const SYSTEM_PROMPT = [
  "你是「AI 遊戲工作室」的資深遊戲企劃助手，正在協助管理員設計一款新的線上遊戲。",
  "",
  "行為準則：",
  "1. 用繁體中文回答，語氣專業、簡潔、有耐心。",
  "2. 絕對不要在需求不清楚時亂猜。缺什麼資訊，就一個一個問清楚。",
  "3. 每次回覆都要先「整理目前已知」，再列出「還需要確認的問題」（最多 5 條）。",
  "4. 收到足夠資訊後，主動提出遊戲規格建議，讓管理員選「套用」或「重新思考」。",
  "5. 不能自行發布、不能刪除遊戲、不能修改玩家資料、不能改排行榜或商城。所有正式變更由管理員按鈕觸發。",
  "6. 修改階段時，只調整相關內容，不要整個重做。",
  "",
  "輸出必須是合法 JSON，除此之外不要有任何文字：",
  '{"reply":"...","spec_updates":{},"questions":[],"suggestions":[],"progress":0,"ready_to_build":false,"ready_to_publish":false}',
  "",
  "draft_spec 可用欄位：name, emoji, category, primitive, description, min_players, max_players, needs_ai, needs_matchmaking, needs_leaderboard, needs_timer, timer_seconds, win_condition, lose_condition, rules[], ui[], levels, extras{}。",
].join("\n");

export const studioChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    sessionId: string;
    userMessage: string;
    images?: string[];
    currentSpec: StudioDraftSpec;
    history: { role: "user" | "assistant"; content: string }[];
  }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY 未設定");

    const userContent: any[] = [
      { type: "text", text: `目前 draft_spec:\n${JSON.stringify(data.currentSpec, null, 2)}\n\n管理員：${data.userMessage}` },
    ];
    if (data.images?.length) {
      for (const url of data.images.slice(0, 4)) {
        userContent.push({ type: "image_url", image_url: { url } });
      }
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...data.history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent },
    ];

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        response_format: { type: "json_object" },
      }),
    });
    if (r.status === 429) throw new Error("AI 呼叫太頻繁，請稍後再試");
    if (r.status === 402) throw new Error("AI 額度已用完，請至帳單設定加值");
    if (!r.ok) throw new Error(`AI 錯誤 ${r.status}`);
    const j = await r.json();
    const raw = j.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); }
    catch { parsed = { reply: raw, spec_updates: {}, questions: [], suggestions: [], progress: 0 }; }
    return {
      reply: String(parsed.reply ?? ""),
      spec_updates: parsed.spec_updates ?? {},
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      progress: typeof parsed.progress === "number" ? parsed.progress : 0,
      ready_to_build: !!parsed.ready_to_build,
      ready_to_publish: !!parsed.ready_to_publish,
    };
  });

export const checkAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    return { isAdmin: !!data, userId: context.userId };
  });
