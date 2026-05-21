const STORAGE_KEY = "draw_client_id";
const NAME_KEY = "draw_name";

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function getSavedName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NAME_KEY) || "";
}

export function saveName(name: string) {
  localStorage.setItem(NAME_KEY, name);
}

export function makeRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const WORDS = [
  "蘋果", "貓咪", "汽車", "太陽", "月亮", "星星", "雨傘", "彩虹", "鳳梨", "西瓜",
  "電腦", "手機", "飛機", "火車", "腳踏車", "雪人", "聖誕樹", "蛋糕", "披薩", "漢堡",
  "草莓", "香蕉", "恐龍", "獨角獸", "城堡", "海盜", "火箭", "機器人", "金字塔", "燈泡",
  "時鐘", "眼鏡", "雨鞋", "雨衣", "氣球", "風箏", "船", "魚", "章魚", "螃蟹",
  "熊貓", "長頸鹿", "獅子", "大象", "蝴蝶", "蜜蜂", "向日葵", "仙人掌", "城市", "山脈",
  "鍵盤", "滑鼠", "耳機", "相機", "吉他", "鋼琴", "鼓", "麥克風", "冰淇淋", "甜甜圈",
] as const;

export function pickWords(n = 3): string[] {
  const pool = [...WORDS];
  const out: string[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

export function makeHint(word: string): string {
  return word.split("").map(() => "＿").join(" ");
}

export function pickColor(seed: string): string {
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#a855f7", "#ec4899"];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return colors[Math.abs(h) % colors.length];
}

export const ROUND_SECONDS = 75;