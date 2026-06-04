export type MiniGameMeta = {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  players: string;
  color: string;
};

export const MINI_GAMES: MiniGameMeta[] = [
  { id: "tictactoe", name: "井字遊戲", emoji: "⭕", desc: "經典三連線", players: "2 人", color: "#ef4444" },
  { id: "gomoku", name: "五子棋", emoji: "⚫", desc: "先連五子者勝", players: "2 人", color: "#0f172a" },
  { id: "reversi", name: "黑白棋", emoji: "⚪", desc: "翻轉對手的棋子", players: "2 人", color: "#475569" },
  { id: "connect4", name: "四子棋", emoji: "🔴", desc: "重力連四子", players: "2 人", color: "#f97316" },
  { id: "rps", name: "剪刀石頭布", emoji: "✊", desc: "五戰三勝", players: "2 人", color: "#eab308" },
  { id: "memory", name: "記憶翻牌", emoji: "🃏", desc: "配對找對子", players: "2 人", color: "#a855f7" },
  { id: "dice", name: "骰子比大小", emoji: "🎲", desc: "誰的點數高", players: "2-4 人", color: "#06b6d4" },
  { id: "numberguess", name: "終極密碼", emoji: "🔢", desc: "縮小範圍猜數字", players: "2-4 人", color: "#22c55e" },
  { id: "wordchain", name: "文字接龍", emoji: "🐉", desc: "用上字尾接新詞", players: "2-4 人", color: "#ec4899" },
  { id: "snap", name: "心臟病", emoji: "❤️", desc: "看到一就拍！", players: "2-4 人", color: "#dc2626" },
  { id: "quickdraw", name: "牛仔對決", emoji: "🤠", desc: "看到 GO 立刻拍", players: "2-4 人", color: "#7c3aed" },
  { id: "nim", name: "取石頭", emoji: "🪨", desc: "拿到最後一顆者輸", players: "2 人", color: "#64748b" },
  { id: "coinflip", name: "猜硬幣", emoji: "🪙", desc: "正反猜中得分", players: "2 人", color: "#f59e0b" },
  { id: "highlow", name: "比大小", emoji: "🃏", desc: "猜下一張高或低", players: "2 人", color: "#10b981" },
  { id: "dotsboxes", name: "點格棋", emoji: "🔲", desc: "圍出方格得分", players: "2 人", color: "#3b82f6" },
  { id: "treasure", name: "尋寶對戰", emoji: "💎", desc: "找出對手的寶藏", players: "2 人", color: "#0ea5e9" },
  { id: "mathrace", name: "心算王", emoji: "➕", desc: "最快答對得分", players: "2-4 人", color: "#14b8a6" },
  { id: "typing", name: "打字賽", emoji: "⌨️", desc: "最快輸入完成者勝", players: "2-4 人", color: "#8b5cf6" },
  { id: "bingo", name: "賓果", emoji: "🎱", desc: "連成一線喊 BINGO", players: "2-4 人", color: "#f43f5e" },
  { id: "hangman", name: "吊死鬼", emoji: "💀", desc: "猜字母拯救小人", players: "2-4 人", color: "#111827" },
];

export function getMiniGame(id: string) {
  return MINI_GAMES.find((g) => g.id === id);
}