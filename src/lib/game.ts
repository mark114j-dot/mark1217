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

export type CategoryId = "animal" | "object" | "idiom" | "hard";

export const CATEGORIES: { id: CategoryId; label: string; emoji: string; words: string[] }[] = [
  {
    id: "animal",
    label: "動物",
    emoji: "🐾",
    words: [
      "貓咪", "狗狗", "熊貓", "長頸鹿", "獅子", "大象", "蝴蝶", "蜜蜂", "章魚", "螃蟹",
      "企鵝", "海豚", "鯨魚", "鯊魚", "袋鼠", "無尾熊", "刺蝟", "松鼠", "兔子", "倉鼠",
      "鱷魚", "烏龜", "青蛙", "蜘蛛", "孔雀", "貓頭鷹", "老鷹", "火烈鳥", "斑馬", "猴子",
      "犀牛", "河馬", "豹", "狼", "狐狸", "羊駝", "水母", "海星",
    ],
  },
  {
    id: "object",
    label: "物品 / 食物",
    emoji: "🍕",
    words: [
      "蘋果", "西瓜", "鳳梨", "草莓", "香蕉", "蛋糕", "披薩", "漢堡", "冰淇淋", "甜甜圈",
      "電腦", "手機", "飛機", "火車", "腳踏車", "雨傘", "氣球", "風箏", "燈泡", "時鐘",
      "眼鏡", "相機", "鍵盤", "滑鼠", "耳機", "吉他", "鋼琴", "麥克風", "雨鞋", "口罩",
      "雪人", "聖誕樹", "城堡", "火箭", "機器人", "金字塔", "向日葵", "仙人掌", "彩虹",
    ],
  },
  {
    id: "idiom",
    label: "成語",
    emoji: "📜",
    words: [
      "畫蛇添足", "井底之蛙", "守株待兔", "亡羊補牢", "對牛彈琴", "畫龍點睛", "狐假虎威",
      "杯弓蛇影", "葉公好龍", "刻舟求劍", "塞翁失馬", "愚公移山", "破釜沉舟", "臥薪嘗膽",
      "鶴立雞群", "九牛一毛", "雪中送炭", "畫餅充飢", "緣木求魚", "掩耳盜鈴", "亡羊補牢",
      "魚目混珠", "笑裡藏刀", "雞犬不寧", "馬到成功", "龍飛鳳舞", "虎頭蛇尾", "鳥語花香",
    ],
  },
  {
    id: "hard",
    label: "困難",
    emoji: "🔥",
    words: [
      "重力", "時間", "夢想", "回憶", "靈魂", "民主", "通膨", "演算法", "量子", "黑洞",
      "光合作用", "DNA", "區塊鏈", "人工智慧", "永動機", "蟲洞", "薛丁格", "莫比烏斯",
      "矛盾", "鄉愁", "孤獨", "嫉妒", "勇氣", "信任", "希望", "後悔", "預言", "宿命",
      "病毒", "細胞", "電磁", "重力波", "化石", "板塊", "極光", "海嘯",
    ],
  },
];

export function getCategory(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export function pickWords(categoryId: CategoryId, n = 3, exclude: Set<string> = new Set()): string[] {
  const all = getCategory(categoryId).words;
  let pool = all.filter((w) => !exclude.has(w));
  // If exclusion left too few, reset
  if (pool.length < n) pool = [...all];
  const out: string[] = [];
  const work = [...pool];
  for (let i = 0; i < n && work.length; i++) {
    out.push(work.splice(Math.floor(Math.random() * work.length), 1)[0]);
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