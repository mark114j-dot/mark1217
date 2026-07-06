import { useEffect, useState } from "react";

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
    your_name: "你的名字", pick_avatar: "選擇你的角色", room_code: "房間代碼",
    create_room: "建立新房間", join: "加入", or: "或",
    hub_title: "小遊戲大廳", studio_pub: "工作室發布",
    delete: "刪除", confirm_delete: "確定刪除這款遊戲？此動作無法復原。",
    lang_label: "語言",
  },
  "zh-Hans": {
    play: "开始游戏", back: "返回", shop: "商店", invite: "邀请好友",
    gems: "宝石", coins: "金币", buy: "购买", owned: "已拥有",
    announcement: "公告", type_to_continue: "请完整输入公告内容才能继续",
    your_name: "你的名字", pick_avatar: "选择你的角色", room_code: "房间代码",
    create_room: "创建新房间", join: "加入", or: "或",
    hub_title: "小游戏大厅", studio_pub: "工作室发布",
    delete: "删除", confirm_delete: "确定删除这款游戏？此操作无法恢复。",
    lang_label: "语言",
  },
  en: {
    play: "Play", back: "Back", shop: "Shop", invite: "Invite friends",
    gems: "Gems", coins: "Coins", buy: "Buy", owned: "Owned",
    announcement: "Announcement", type_to_continue: "Type the announcement to continue",
    your_name: "Your name", pick_avatar: "Pick your avatar", room_code: "Room code",
    create_room: "Create new room", join: "Join", or: "or",
    hub_title: "Mini Games Hub", studio_pub: "Studio releases",
    delete: "Delete", confirm_delete: "Delete this game? This cannot be undone.",
    lang_label: "Language",
  },
  ja: {
    play: "プレイ", back: "戻る", shop: "ショップ", invite: "招待",
    gems: "ジェム", coins: "コイン", buy: "購入", owned: "所持済み",
    announcement: "お知らせ", type_to_continue: "続けるには本文を入力してください",
    your_name: "あなたの名前", pick_avatar: "アバターを選択", room_code: "ルームコード",
    create_room: "新しいルーム作成", join: "参加", or: "または",
    hub_title: "ミニゲームロビー", studio_pub: "スタジオ公開",
    delete: "削除", confirm_delete: "このゲームを削除しますか？取り消せません。",
    lang_label: "言語",
  },
  ko: {
    play: "플레이", back: "뒤로", shop: "상점", invite: "친구 초대",
    gems: "젬", coins: "코인", buy: "구매", owned: "보유 중",
    announcement: "공지", type_to_continue: "계속하려면 공지 내용을 입력하세요",
    your_name: "이름", pick_avatar: "아바타 선택", room_code: "방 코드",
    create_room: "새 방 만들기", join: "입장", or: "또는",
    hub_title: "미니 게임 로비", studio_pub: "스튜디오 공개",
    delete: "삭제", confirm_delete: "이 게임을 삭제할까요? 되돌릴 수 없습니다.",
    lang_label: "언어",
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
  if (typeof window !== "undefined") {
    localStorage.setItem("lang", lang);
    window.dispatchEvent(new CustomEvent("lang-change", { detail: lang }));
  }
}

// Reactive hook: re-renders when language changes via setStoredLang or another tab
export function useLang(): [string, (l: string) => void] {
  const [lang, setLang] = useState<string>("zh-Hant");
  useEffect(() => {
    setLang(getStoredLang());
    const onChange = () => setLang(getStoredLang());
    window.addEventListener("lang-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("lang-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return [lang, (l: string) => setStoredLang(l)];
}

export function useT() {
  const [lang] = useLang();
  return (key: string) => t(lang, key);
}