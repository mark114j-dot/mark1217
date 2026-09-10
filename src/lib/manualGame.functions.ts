import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// 檢查用戶是否為管理員
async function isAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  return !!data;
}

// 將遊戲名稱轉換為 URL 安全的 slug
// 例如："我的精彩遊戲" -> "我的精彩遊戲"
function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

// 手動新增遊戲的輸入資料型別
type ManualGameInput = {
  name: string;           // 遊戲名稱 (必填)
  html_content: string;   // 完整的 HTML 遊戲程式碼 (必填)
};

// 建立手動遊戲的伺服器函數
export const createManualGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])  // 驗證使用者已登入
  .inputValidator((d: ManualGameInput) => d)
  .handler(async ({ data, context }) => {
    // 1️⃣ 權限驗證：確保只有管理員可以手動新增遊戲
    if (!(await isAdmin(context))) throw new Error("需要管理員權限");

    // 2️⃣ 資料驗證
    const name = data.name.trim();
    const html = data.html_content.trim();
    if (!name) throw new Error("請輸入遊戲名稱");
    if (!html) throw new Error("請貼上遊戲程式碼");
    if (html.length > 10_000_000) throw new Error("遊戲程式碼不能超過 10,000 KB");

    // 3️⃣ 生成遊戲網址 slug（自動避免重複）
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

    // 4️⃣ 直接發布遊戲到資料庫
    const { data: game, error } = await context.supabase
      .from("games")
      .insert({
        slug,                          // 遊戲 URL 網址
        name,                          // 遊戲名稱
        emoji: "🎮",                   // 遊戲表情符號
        description: "管理員手動發布的遊戲",  // 遊戲描述
        category: "misc",              // 分類
        primitive: "custom",           // 遊戲類型
        spec: { source: "manual" },    // 來源標記
        min_players: 1,                // 最少玩家數
        max_players: 1,                // 最多玩家數
        html_content: html,            // 遊戲 HTML 程式碼
        play_url: null,                // 外部遊戲 URL（留空）
        cover_image_url: null,         // 封面圖片（留空）
        instructions: null,            // 遊戲説明（留空）
        offline_ok: false,             // 不支援離線
        status: "published",           // 狀態：直接發布
        version: 1,                    // 版本號
        created_by: context.userId,    // 建立者（管理員）
      })
      .select("id,slug,name,status")
      .single();

    if (error) throw new Error(error.message);
    return game;  // 回傳新建立的遊戲資訊
  });
