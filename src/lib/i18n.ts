// Minimal locale strings. Language stored in profile; falls back to zh-Hant.
export const COUNTRIES: Array<{ code: string; flag: string; name: string; lang: string }> = [
  { code: "TW", flag: "🇹🇼", name: "台灣", lang: "zh-Hant" },
  { code: "HK", flag: "🇭🇰", name: "香港", lang: "zh-Hant" },
  { code: "CN", flag: "🇨🇳", name: "中国大陆", lang: "zh-Hans" },
  { code: "JP", flag: "🇯🇵", name: "日本", lang: "ja" },
  { code: "KR", flag: "🇰🇷", name: "한국", lang: "ko" },
  { code: "US", flag: "🇺🇸", name: "United States", lang: "en" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", lang: "en" },
  { code: "DE", flag: "🇩🇪", name: "Deutschland", lang: "de" },
  { code: "FR", flag: "🇫🇷", name: "France", lang: "fr" },
  { code: "ES", flag: "🇪🇸", name: "España", lang: "es" },
  { code: "TH", flag: "🇹🇭", name: "ประเทศไทย", lang: "th" },
  { code: "VN", flag: "🇻🇳", name: "Việt Nam", lang: "vi" },
  { code: "ID", flag: "🇮🇩", name: "Indonesia", lang: "id" },
  { code: "MY", flag: "🇲🇾", name: "Malaysia", lang: "ms" },
  { code: "SG", flag: "🇸🇬", name: "Singapore", lang: "en" },
];

const STRINGS: Record<string, Record<string, string>> = {
  "zh-Hant": {
    play: "開始遊戲", back: "返回", shop: "商店", invite: "邀請好友",
    gems: "寶石", coins: "金幣", buy: "購買", owned: "已擁有",
    announcement: "公告", type_to_continue: "請完整輸入公告內容才能繼續",
  },
  "zh-Hans": {
    play: "开始游戏", back: "返回", shop: "商店", invite: "邀请好友",
    gems: "宝石", coins: "金币", buy: "购买", owned: "已拥有",
    announcement: "公告", type_to_continue: "请完整输入公告内容才能继续",
  },
  en: {
    play: "Play", back: "Back", shop: "Shop", invite: "Invite friends",
    gems: "Gems", coins: "Coins", buy: "Buy", owned: "Owned",
    announcement: "Announcement", type_to_continue: "Type the announcement to continue",
  },
  ja: {
    play: "プレイ", back: "戻る", shop: "ショップ", invite: "招待",
    gems: "ジェム", coins: "コイン", buy: "購入", owned: "所持済み",
    announcement: "お知らせ", type_to_continue: "続けるには本文を入力してください",
  },
  ko: {
    play: "플레이", back: "뒤로", shop: "상점", invite: "친구 초대",
    gems: "젬", coins: "코인", buy: "구매", owned: "보유 중",
    announcement: "공지", type_to_continue: "계속하려면 공지 내용을 입력하세요",
  },
};

export function t(lang: string | null | undefined, key: string): string {
  const l = lang && STRINGS[lang] ? lang : "zh-Hant";
  return STRINGS[l][key] ?? STRINGS["zh-Hant"][key] ?? key;
}

export function getStoredLang(): string {
  if (typeof window === "undefined") return "zh-Hant";
  return localStorage.getItem("lang") || "zh-Hant";
}

export function setStoredLang(lang: string) {
  if (typeof window !== "undefined") localStorage.setItem("lang", lang);
}