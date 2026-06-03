import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Users } from "lucide-react";
import { useMiniRoom } from "@/lib/useMiniRoom";
import { getMiniGame } from "@/lib/miniGames";
import { GAME_COMPONENTS } from "@/components/mini/games";
import { toast } from "sonner";

export const Route = createFileRoute("/mini/$type/$code")({
  component: MiniRoomPage,
});

function MiniRoomPage() {
  const { type, code } = Route.useParams();
  const meta = getMiniGame(type);
  const { room, loading, error, meId, update } = useMiniRoom(code);

  if (loading) return <div className="min-h-screen flex items-center justify-center">載入中…</div>;
  if (error || !room || !meta)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p>{error ?? "錯誤"}</p>
        <Link to="/games" className="border-brutal shadow-brutal-sm rounded-lg px-4 py-2 bg-card">回大廳</Link>
      </div>
    );

  const Game = GAME_COMPONENTS[type];

  function copyCode() {
    navigator.clipboard.writeText(code);
    toast.success("已複製房號");
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-5">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Link to="/games" className="border-brutal shadow-brutal-sm rounded-lg p-2 bg-card hover:translate-y-0.5 hover:shadow-none transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="font-display font-black text-xl flex items-center gap-2">
            <span className="text-2xl">{meta.emoji}</span>
            {meta.name}
          </h1>
          <button
            onClick={copyCode}
            className="ml-auto border-brutal shadow-brutal-sm rounded-lg px-3 py-1.5 bg-secondary font-mono font-bold flex items-center gap-2 hover:translate-y-0.5 hover:shadow-none transition"
          >
            {code} <Copy className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-card border-brutal shadow-brutal rounded-2xl p-3 mb-4 flex items-center gap-2 flex-wrap">
          <Users className="w-4 h-4 text-muted-foreground" />
          {room.players.map((p) => (
            <span
              key={p.client_id}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 text-sm ${p.client_id === meId ? "border-foreground bg-secondary/40" : "border-foreground/20"}`}
            >
              <span>{p.avatar}</span>
              <span className="font-bold">{p.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{p.score}</span>
            </span>
          ))}
        </div>

        {Game ? (
          <Game room={room} meId={meId} update={update} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">遊戲尚未上線</div>
        )}
      </div>
    </div>
  );
}