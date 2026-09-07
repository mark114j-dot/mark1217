import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AiOp =
  | { type: "game.update"; slug: string; fields: Record<string, string | number | boolean> }
  | { type: "game.status"; slug: string; status: "published" | "draft" | "archived" }
  | { type: "game.delete"; slug: string }
  | { type: "theme.set"; vars: Record<string, string> };

export type AiChange = {
  id: string;
  summary: string;
  ops: AiOp[];
  status: "pending" | "applied" | "reverted" | "rejected";
  created_at: string;
  applied_at: string | null;
  reverted_at: string | null;
};

const GAME_FIELDS = [
  "name", "emoji", "description", "category", "instructions",
  "cover_color", "offline_ok", "min_players", "max_players",
] as const;

const THEME_VARS = [
  "background", "foreground", "card", "card-foreground", "primary", "primary-foreground",
  "secondary", "secondary-foreground", "accent", "accent-foreground", "muted",
  "muted-foreground", "border", "input", "ring", "radius",
] as const;

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId, _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("僅限管理員使用");
}

function sanitizeOps(raw: any): AiOp[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: AiOp[] = [];
  for (const o of list.slice(0, 20)) {
    if (!o || typeof o !== "object") continue;
    if (o.type === "game.update" && typeof o.slug === "string") {
      const fields: Record<string, string | number | boolean> = {};
      for (const k of GAME_FIELDS) if (o.fields && o.fields[k] !== undefined) fields[k] = o.fields[k] as string | number | boolean;
      if (Object.keys(fields).length) out.push({ type: "game.update", slug: o.slug, fields });
    } else if (o.type === "game.status" && typeof o.slug === "string"
      && ["published", "draft", "archived"].includes(o.status)) {
      out.push({ type: "game.status", slug: o.slug, status: o.status });
    } else if (o.type === "game.delete" && typeof o.slug === "string") {
      out.push({ type: "game.delete", slug: o.slug });
    } else if (o.type === "theme.set" && o.vars && typeof o.vars === "object") {
      const vars: Record<string, string> = {};
      for (const k of THEME_VARS) {
        const v = o.vars[k];
        if (typeof v === "string" && v.length < 60) vars[k] = v;
      }
      if (Object.keys(vars).length) out.push({ type: "theme.set", vars });
    }
  }
  return out;
}

function extractJson(raw: string) {
  const cleaned = String(raw || "").trim()
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
    if (s >= 0 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
    return { reply: cleaned, ops: [], summary: "" };
  }
}

const SYSTEM = [
  "你是這個遊戲平台的後台 AI 管理助手，只服務網站擁有者（管理員）。",
  "你可以提出兩類變更：遊戲內容（名稱、說明、圖示表情、分類、玩法說明、是否免連線、上架/下架、刪除）與網站外觀主題（顏色變數）。",
  "你不能改動玩家資料、錢包、排行榜或程式原始碼；被要求時要說明做不到。",
  "所有變更都只是「提案」，需要管理員按下確認才會生效。",
  "顏色一律使用 oklch() 格式，例如 oklch(0.55 0.2 265)。",
  "",
  "回覆必須是合法 JSON，沒有其他文字：",
  '{"reply":"用繁體中文說明你打算做什麼或詢問","summary":"一句話變更摘要","ops":[]}',
  "ops 支援：",
  '{"type":"game.update","slug":"...","fields":{"name":"","emoji":"","description":"","category":"","instructions":"","offline_ok":true,"min_players":1,"max_players":4}}',
  '{"type":"game.status","slug":"...","status":"published|draft|archived"}',
  '{"type":"game.delete","slug":"..."}',
  '{"type":"theme.set","vars":{"primary":"oklch(...)","background":"oklch(...)","accent":"oklch(...)"}}',
  "資訊不足時 ops 留空並提問。",
].join("\n");

export const aiPropose = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { message: string; history?: { role: "user" | "assistant"; content: string }[] }) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI 金鑰未設定");

    const { data: games } = await context.supabase
      .from("games")
      .select("slug,name,emoji,category,status,offline_ok,description")
      .order("updated_at", { ascending: false })
      .limit(60);
    const { data: theme } = await context.supabase
      .from("site_settings").select("value").eq("key", "theme").maybeSingle();

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          ...(data.history ?? []).slice(-10),
          {
            role: "user",
            content: `目前遊戲清單：\n${JSON.stringify(games ?? [], null, 1)}\n\n目前主題設定：${JSON.stringify(theme?.value ?? {})}\n\n管理員：${data.message}`,
          },
        ],
      }),
    });
    if (r.status === 429) throw new Error("AI 呼叫太頻繁，請稍後再試");
    if (r.status === 402) throw new Error("AI 額度已用完");
    if (!r.ok) throw new Error(`AI 錯誤 ${r.status}`);
    const j = await r.json();
    const parsed = extractJson(j.choices?.[0]?.message?.content ?? "{}");
    const ops = sanitizeOps(parsed.ops);
    const reply = String(parsed.reply ?? "");
    const summary = String(parsed.summary ?? "").slice(0, 200);

    let changeId: string | null = null;
    if (ops.length) {
      const { data: row, error } = await context.supabase
        .from("admin_ai_changes")
        .insert({ actor_id: context.userId, summary: summary || reply.slice(0, 100), ops: ops as any, status: "pending" })
        .select("id").single();
      if (error) throw new Error(error.message);
      changeId = row.id;
    }
    return { reply, summary, ops, changeId };
  });

async function snapshotFor(supabase: any, ops: AiOp[]) {
  const snap: any[] = [];
  for (const op of ops) {
    if (op.type === "theme.set") {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "theme").maybeSingle();
      snap.push({ type: "theme", value: data?.value ?? null });
    } else {
      const { data } = await supabase.from("games").select("*").eq("slug", op.slug).maybeSingle();
      snap.push({ type: "game", slug: op.slug, row: data ?? null });
    }
  }
  return snap;
}

export const aiApply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: change, error } = await context.supabase
      .from("admin_ai_changes").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    if (change.status !== "pending") throw new Error("這個變更已經處理過了");

    const ops = sanitizeOps(change.ops);
    const before = await snapshotFor(context.supabase, ops);

    for (const op of ops) {
      if (op.type === "theme.set") {
        const { data: cur } = await context.supabase
          .from("site_settings").select("value").eq("key", "theme").maybeSingle();
        const merged = { ...((cur?.value as any)?.vars ?? {}), ...op.vars };
        const { error: e } = await context.supabase.from("site_settings")
          .upsert({ key: "theme", value: { vars: merged }, updated_by: context.userId }, { onConflict: "key" });
        if (e) throw new Error(e.message);
      } else if (op.type === "game.update") {
        const { error: e } = await context.supabase.from("games").update(op.fields as any).eq("slug", op.slug);
        if (e) throw new Error(e.message);
      } else if (op.type === "game.status") {
        const { error: e } = await context.supabase.from("games").update({ status: op.status }).eq("slug", op.slug);
        if (e) throw new Error(e.message);
      } else if (op.type === "game.delete") {
        const { data: g } = await context.supabase.from("games").select("id").eq("slug", op.slug).maybeSingle();
        if (g) {
          await context.supabase.from("game_versions").delete().eq("game_id", g.id);
          await context.supabase.from("studio_sessions").update({ game_id: null }).eq("game_id", g.id);
          const { error: e } = await context.supabase.from("games").delete().eq("id", g.id);
          if (e) throw new Error(e.message);
        }
      }
    }

    await context.supabase.from("admin_ai_changes").update({
      status: "applied", before_snapshot: before as any, applied_at: new Date().toISOString(),
    }).eq("id", data.id);
    return { ok: true };
  });

export const aiReject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("admin_ai_changes")
      .update({ status: "rejected" }).eq("id", data.id).eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const aiRevert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: change, error } = await context.supabase
      .from("admin_ai_changes").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    if (change.status !== "applied") throw new Error("只有已套用的變更可以回復");
    const age = Date.now() - new Date(change.applied_at ?? change.created_at).getTime();
    if (age > 7 * 24 * 3600 * 1000) throw new Error("超過 7 天的變更無法回復");

    for (const item of (change.before_snapshot ?? []) as any[]) {
      if (item.type === "theme") {
        if (item.value) {
          await context.supabase.from("site_settings")
            .upsert({ key: "theme", value: item.value, updated_by: context.userId }, { onConflict: "key" });
        } else {
          await context.supabase.from("site_settings").delete().eq("key", "theme");
        }
      } else if (item.type === "game" && item.row) {
        const { error: e } = await context.supabase.from("games").upsert(item.row, { onConflict: "id" });
        if (e) throw new Error(e.message);
      }
    }
    await context.supabase.from("admin_ai_changes")
      .update({ status: "reverted", reverted_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });

export const aiListChanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    await context.supabase.from("admin_ai_changes").delete().lt("created_at", cutoff);
    const { data, error } = await context.supabase
      .from("admin_ai_changes")
      .select("id,summary,ops,status,created_at,applied_at,reverted_at")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AiChange[];
  });
