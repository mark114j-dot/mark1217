import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Brain, Calculator, Clock3, Gamepad2, Grid3X3, Heart, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/games/senior")({
  component: SeniorGamesPage,
  head: () => ({
    meta: [
      { title: "銀髮友善遊戲專區｜簡單益智、記憶、數字與反應遊戲｜畫聊 Doodle" },
      { name: "description", content: "給長輩與銀髮族的友善小遊戲專區。大字體、高對比、簡單規則，提供容易上手的益智、棋盤、數字與觀察遊戲。" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "銀髮友善遊戲專區｜畫聊 Doodle" },
      { property: "og:description", content: "大字體、簡單規則、容易上手的免費益智小遊戲，適合長輩與家人一起玩。" },
      { property: "og:type", content: "website" },
    ],
  }),
});

type SeniorGame = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
  description: string | null;
  category: string | null;
  cover_image_url: string | null;
};

function categoryInfo(category: string | null) {
  if (category === "math") return { label: "數字益智", Icon: Calculator };
  if (category === "logic" || category === "board") return { label: "邏輯棋盤", Icon: Grid3X3 };
  if (category === "speed") return { label: "觀察反應", Icon: Search };
  return { label: "益智休閒", Icon: Brain };
}

function SeniorGamesPage() {
  const [games, setGames] = useState<SeniorGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("games")
        .select("id,slug,name,emoji,description,category,cover_image_url")
        .eq("status", "published")
        .in("category", ["logic", "math", "board", "puzzle", "misc"])
        .order("play_count", { ascending: false })
        .limit(12);
      setGames((data ?? []) as SeniorGame[]);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link to="/games" className="inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 px-5 py-3 text-lg font-bold hover:bg-muted">
            <ArrowLeft className="h-5 w-5" /> 返回遊戲大廳
          </Link>
        </div>

        <section className="mb-8 rounded-[2rem] border-2 bg-card p-6 shadow-sm md:p-10">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-base font-bold">
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

        <div className="mb-5 flex items-center gap-3">
          <Gamepad2 className="h-7 w-7" />
          <h2 className="text-3xl font-black">推薦遊戲</h2>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-64 animate-pulse rounded-[1.75rem] bg-muted" />)}
          </div>
        ) : games.length === 0 ? (
          <div className="rounded-[1.75rem] border-2 bg-card p-8 text-center">
            <div className="text-5xl">🎮</div>
            <h2 className="mt-3 text-2xl font-black">遊戲正在準備中</h2>
            <p className="mt-2 text-lg text-muted-foreground">目前還沒有符合條件的已發布遊戲。</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => {
              const { label, Icon } = categoryInfo(game.category);
              return (
                <Link
                  key={game.id}
                  to="/play/$slug"
                  params={{ slug: game.slug }}
                  className="group rounded-[1.75rem] border-2 bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-ring"
                >
                  <div className="mb-5 aspect-[16/9] overflow-hidden rounded-2xl border-2 bg-muted">
                    {game.cover_image_url ? <img src={game.cover_image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-7xl">{game.emoji ?? "🎮"}</div>}
                  </div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-3xl font-black">{game.name}</h3>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 px-3 py-1.5 text-sm font-bold"><Icon className="h-4 w-4" />{label}</span>
                  </div>
                  <p className="min-h-14 text-lg leading-7 text-muted-foreground">{game.description || "簡單、輕鬆、適合慢慢玩的免費小遊戲。"}</p>
                  <div className="mt-5 rounded-2xl border-2 px-5 py-3 text-center text-xl font-black group-hover:bg-muted">開始遊戲 ▶</div>
                </Link>
              );
            })}
          </div>
        )}

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
