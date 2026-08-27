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
  html_content?: string;
  play_url?: string;
  cover_image_url?: string;
  instructions?: string;
  offline_ok?: boolean;
  generated_at?: string;
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

// Delete a published/draft game (admin only). Cleans up related game_versions.
export const deleteGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    await context.supabase.from("game_versions").delete().eq("game_id", data.id);
    await context.supabase.from("studio_sessions").update({ game_id: null }).eq("game_id", data.id);
    const { error } = await context.supabase.from("games").delete().eq("id", data.id);
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

function extractJson(raw: string) {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(cleaned); }
  catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("AI 回傳格式無法解析");
  }
}

function normalizeHtml(input: string) {
  let html = String(input || "").trim()
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  if (!html) throw new Error("AI 沒有產生遊戲程式");
  if (!/<html[\s>]/i.test(html)) {
    html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Game</title></head><body>${html}</body></html>`;
  }
  // Inject strict CSP so uploaded/AI HTML cannot phone home, load remote scripts, or frame anything.
  // sandbox on the iframe (allow-scripts only, no allow-same-origin) already isolates it from the parent origin;
  // CSP is defense-in-depth against data exfiltration via fetch/img/beacon.
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors *;">`;
  const referrer = `<meta name="referrer" content="no-referrer">`;
  if (/<head[\s>]/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>${csp}${referrer}`);
  } else {
    html = html.replace(/<html([^>]*)>/i, `<html$1><head>${csp}${referrer}</head>`);
  }
  const guard = `<script>(()=>{const show=(m)=>{let el=document.getElementById('__ai_game_error__');if(!el){el=document.createElement('pre');el.id='__ai_game_error__';el.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:999999;background:#fff3f3;color:#8b0000;border:2px solid #8b0000;border-radius:10px;padding:10px;font:12px/1.4 monospace;white-space:pre-wrap;max-height:35vh;overflow:auto';document.body.appendChild(el)}el.textContent='遊戲程式錯誤：\\n'+m};window.addEventListener('error',e=>show(e.message||String(e.error||e)));window.addEventListener('unhandledrejection',e=>show(String(e.reason&&e.reason.message||e.reason||e)));})();<\/script>`;
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${guard}</body>`) : `${html}${guard}`;
  if (html.length > 500_000) throw new Error("產生的遊戲程式太大，請要求 AI 簡化後再產生");
  return html;
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
    if (!spec.html_content && !spec.play_url) {
      throw new Error("尚未上傳遊戲內容：請提供遊戲 HTML 或外部連結");
    }

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
          html_content: spec.html_content ?? null,
          play_url: spec.play_url ?? null,
          cover_image_url: spec.cover_image_url ?? null,
          instructions: spec.instructions ?? null,
          offline_ok: !!spec.offline_ok,
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
          html_content: spec.html_content ?? null,
          play_url: spec.play_url ?? null,
          cover_image_url: spec.cover_image_url ?? null,
          instructions: spec.instructions ?? null,
          offline_ok: !!spec.offline_ok,
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
  "draft_spec 可用欄位：name, emoji, category, primitive, description, min_players, max_players, needs_ai, needs_matchmaking, needs_leaderboard, needs_timer, timer_seconds, win_condition, lose_condition, rules[], ui[], levels, extras{}, play_url, cover_image_url, instructions。",
  "如果管理員要求『生成可玩的遊戲』，先整理規格並提醒可按右側『AI 產生可玩程式』。不要只產生版面，也不要假裝已發布。",
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
      headers: { Authorization: `Bearer ${key}`, "Lovable-API-Key": key, "Content-Type": "application/json" },
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
    try { parsed = extractJson(raw); }
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

export const generatePlayableGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; extraPrompt?: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: session, error } = await context.supabase
      .from("studio_sessions").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);

    const spec = (session.draft_spec ?? {}) as StudioDraftSpec;
    if (!spec.name && !spec.description) throw new Error("請先用聊天描述遊戲名稱或玩法，再產生可玩程式");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY 未設定");
    const history = ((session.messages ?? []) as StudioMessage[]).slice(-12)
      .map((m) => `${m.role === "user" ? "管理員" : "AI"}：${m.content}`).join("\n");

    const prompt = [
      "你是資深 2D Web 遊戲工程師。請根據規格產出一個真正可玩的單檔 HTML 遊戲，不是示意版面。",
      "必須符合：",
      "1. 回傳合法 JSON：{\"html_content\":\"完整HTML\",\"instructions\":\"玩法\",\"summary\":\"完成內容\",\"spec_updates\":{}}。不要輸出 JSON 以外文字。",
      "2. html_content 必須包含完整 <!doctype html><html><head><style>...</style></head><body>...<script>...</script></body></html>。",
      "3. 不可載入外部套件、外部圖片、外部字型、CDN、module import；所有 CSS/JS/素材都要內嵌。",
      "4. 必須有真實遊戲迴圈或互動邏輯、分數/勝負/重新開始、鍵盤與手機觸控支援。",
      "5. 若規格有 AI 對手或 max_players > 1，遊戲首頁要提供模式選擇：單人、同機雙人、AI 對手；每個模式都要可實際玩。",
      "6. 若規格要求排行榜/線上配對，只在遊戲內保留本局分數與清楚的本機多人模式；正式平台排行榜由發布後平台處理，HTML 不可修改玩家資料或商城。",
      "7. 介面使用繁體中文，畫面需適合 iframe 內全螢幕遊玩。",
      "8. 程式碼要保守可靠，不要使用尚未宣告的變數，不要只做按鈕或靜態畫面。",
      "",
      `目前規格：${JSON.stringify(spec, null, 2)}`,
      history ? `最近對話：\n${history}` : "",
      data.extraPrompt ? `額外要求：${data.extraPrompt}` : "",
    ].filter(Boolean).join("\n");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Lovable-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (r.status === 429) throw new Error("AI 呼叫太頻繁，請稍後再試");
    if (r.status === 402) throw new Error("AI 額度已用完，請至帳單設定加值");
    if (!r.ok) throw new Error(`AI 產生遊戲失敗 ${r.status}`);

    const j = await r.json();
    const parsed = extractJson(j.choices?.[0]?.message?.content ?? "{}");
    const html = normalizeHtml(parsed.html_content ?? parsed.html ?? "");
    const nextSpec: StudioDraftSpec = {
      ...spec,
      ...(parsed.spec_updates ?? {}),
      html_content: html,
      instructions: String(parsed.instructions ?? spec.instructions ?? "依遊戲內提示操作。"),
      generated_at: new Date().toISOString(),
    };
    const assistantMsg: StudioMessage = {
      role: "assistant",
      content: String(parsed.summary ?? "已產生可玩的 HTML 遊戲程式，可以在右側預覽並發布。"),
      ts: Date.now(),
    };
    const nextMessages = [...(((session.messages ?? []) as StudioMessage[]) || []), assistantMsg];

    const { data: updated, error: updateError } = await context.supabase
      .from("studio_sessions")
      .update({ draft_spec: nextSpec as any, messages: nextMessages as any, progress: 100 })
      .eq("id", data.id)
      .select("messages,draft_spec,progress")
      .single();
    if (updateError) throw new Error(updateError.message);
    return updated;
  });

export const checkAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    return { isAdmin: !!data, userId: context.userId };
  });
