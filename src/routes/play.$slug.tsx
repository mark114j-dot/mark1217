import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/play/$slug")({
  component: PlayGame,
  head: ({ params }) => ({
    meta: [{ title: `遊玩 ${params.slug} — 畫聊 Doodle` }],
  }),
});

type Game = {
  id: string; slug: string; name: string; emoji: string; description: string;
  html_content: string | null; play_url: string | null;
  cover_image_url: string | null; instructions: string | null;
};

function PlayGame() {
  const { slug } = Route.useParams();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id,slug,name,emoji,description,html_content,play_url,cover_image_url,instructions")
        .eq("slug", slug).eq("status", "published").maybeSingle();
      if (error) setErr(error.message);
      else if (!data) setErr("找不到這款遊戲");
      else setGame(data as any);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <main className="min-h-screen grid place-items-center bg-background"><div>讀取中…</div></main>;
  if (err || !game) return (
    <main className="min-h-screen grid place-items-center bg-background p-6">
      <div className="border-brutal shadow-brutal rounded-2xl bg-card p-6 text-center">
        <div className="text-5xl mb-2">😢</div>
        <div className="font-display text-xl font-bold mb-2">{err ?? "找不到遊戲"}</div>
        <Link to="/games" className="underline">← 回小遊戲大廳</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-foreground/15 px-4 py-2 flex items-center gap-3 bg-card">
        <Link to="/games" className="border-brutal shadow-brutal-sm rounded-lg p-1.5 hover:translate-y-0.5 hover:shadow-none transition">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-2xl">{game.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold truncate">{game.name}</div>
          <div className="text-xs text-muted-foreground truncate">{game.description}</div>
        </div>
      </header>
      <div className="flex-1 relative bg-black">
        {game.play_url ? (
          <iframe
            src={game.play_url}
            title={game.name}
            className="absolute inset-0 w-full h-full"
            sandbox="allow-scripts allow-forms allow-pointer-lock allow-same-origin"
            allow="autoplay; fullscreen; gamepad"
          />
        ) : game.html_content ? (
          <iframe
            srcDoc={game.html_content}
            title={game.name}
            className="absolute inset-0 w-full h-full bg-white"
            sandbox="allow-scripts allow-forms allow-pointer-lock"
            allow="autoplay; fullscreen; gamepad"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-white">此遊戲尚未上傳內容</div>
        )}
      </div>
      {game.instructions && (
        <div className="border-t border-foreground/15 px-4 py-2 text-xs text-muted-foreground bg-card">
          <span className="font-bold text-foreground">說明：</span> {game.instructions}
        </div>
      )}
    </main>
  );
}