import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Brain, Calculator, Clock3, Gamepad2, Grid3X3, Heart, Search } from "lucide-react";

export const Route = createFileRoute("/games/senior")({
  component: SeniorGamesPage,
  head: () => ({
    meta: [
      { title: "銀髮友善遊戲專區｜簡單益智、記憶、數字與反應遊戲｜畫聊 Doodle" },
      { name: "description", content: "給長輩與銀髮族的友善小遊戲專區。大字體、高對比、簡單規則，包含記憶翻牌、終極密碼、找不同、井字遊戲、五子棋與心算遊戲。" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "銀髮友善遊戲專區｜畫聊 Doodle" },
      { property: "og:description", content: "大字體、簡單規則、容易上手的免費益智小遊戲，適合長輩與家人一起玩。" },
      { property: "og:type", content: "website" },
    ],
  }),
});

type SeniorGame = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: string;
  categoryIcon: typeof Brain;
};

const SENIOR_GAMES: SeniorGame[] = [
  { id: "tictactoe", name: "井字遊戲", emoji: "⭕", description: "規則簡單，輪流把三個棋子連成一線。", category: "輕鬆棋盤", categoryIcon: Grid3X3 },
  { id: "memory", name: "記憶翻牌", emoji: "🃏", description: "翻開卡片找出相同圖案，慢慢玩也沒關係。", category: "記憶訓練", categoryIcon: Brain },
  { id: "numberguess", name: "終極密碼", emoji: "🔢", description: "依照提示縮小範圍，猜出正確數字。", category: "數字益智", categoryIcon: Calculator },
  { id: "oddone", name: "找不同", emoji: "🔍", description: "從圖案中找出唯一不同的一個。", category: "觀察力", categoryIcon: Search },
  { id: "bingo", name: "賓果", emoji: "🎱", description: "把數字連成一線，簡單又有趣。", category: "休閒遊戲", categoryIcon: Gamepad2 },
  { id: "gomoku", name: "五子棋", emoji: "⚫", description: "黑白棋子輪流落下，先連五子就獲勝。", category: "棋盤益智", categoryIcon: Grid3X3 },
  { id: "mathrace", name: "心算王", emoji: "➕", description: "用簡單心算挑戰自己的反應與數感。", category: "數字訓練", categoryIcon: Calculator },
  { id: "coinflip", name: "猜硬幣", emoji: "🪙", description: "猜猜下一次是正面還是反面，輕鬆玩一局。", category: "休閒遊戲", categoryIcon: Heart },
];

function SeniorGamesPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/games" className="inline-flex min-h-12 items-center gap-2 rounded-2xl border px-5 py-3 text-lg font-bold hover:bg-muted">
            <ArrowLeft className="h-5 w-5" /> 返回遊戲大廳
          </Link>
        </div>

        <section className="mb-8 rounded-[2rem] border-2 bg-card p-6 shadow-sm md:p-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-base font-bold">
                <Heart className="h-5 w-5" /> 銀髮友善
              </div>
              <h1 className="text-4xl font-black tracking-tight md:text-6xl">長輩遊戲專區</h1>
              <p className="mt-4 max-w-3xl text-xl leading-9 text-muted-foreground md:text-2xl">
                大字體、清楚按鈕、簡單規則。陪爸爸媽媽、阿公阿嬤一起動動腦，慢慢玩就好。
              </p>
            </div>
            <div className="hidden rounded-3xl border-2 p-6 text-center md:block">
              <div className="text-6xl">👵🧓</div>
              <div className="mt-2 text-lg font-black">一起玩最有趣</div>
            </div>
          </div>
        </section>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border-2 bg-card p-5"><div className="text-lg font-bold text-muted-foreground">介面</div><div className="mt-1 text-2xl font-black">大字體</div></div>
          <div className="rounded-2xl border-2 bg-card p-5"><div className="text-lg font-bold text-muted-foreground">操作</div><div className="mt-1 text-2xl font-black">按鈕清楚</div></div>
          <div className="rounded-2xl border-2 bg-card p-5"><div className="text-lg font-bold text-muted-foreground">節奏</div><div className="mt-1 text-2xl font-black">不趕時間</div></div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SENIOR_GAMES.map((game) => {
            const Icon = game.categoryIcon;
            return (
              <Link
                key={game.id}
                to="/mini/$type/$code"
                params={{ type: "senior", code: game.id }}
                className="group rounded-[1.75rem] border-2 bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-ring"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 text-5xl" aria-hidden="true">{game.emoji}</div>
                  <span className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-base font-bold"><Icon className="h-4 w-4" />{game.category}</span>
                </div>
                <h2 className="text-3xl font-black">{game.name}</h2>
                <p className="mt-3 min-h-16 text-lg leading-8 text-muted-foreground">{game.description}</p>
                <div className="mt-5 rounded-2xl border-2 px-5 py-3 text-center text-xl font-black group-hover:bg-muted">開始遊戲 ▶</div>
              </Link>
            );
          })}
        </div>

        <section className="mt-8 rounded-[2rem] border-2 bg-card p-6 md:p-8">
          <div className="flex items-start gap-4">
            <Clock3 className="mt-1 h-7 w-7 shrink-0" />
            <div>
              <h2 className="text-2xl font-black">給家人的小提醒</h2>
              <p className="mt-2 text-lg leading-8 text-muted-foreground">可以一起玩、一起聊天，不需要追求分數。若覺得文字太小，可以先把瀏覽器頁面放大。</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
