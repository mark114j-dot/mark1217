import { Crown, Pencil, Check } from "lucide-react";

export type Player = {
  id: string;
  client_id: string;
  name: string;
  score: number;
  color: string;
  guessed_correctly: boolean;
};

export function PlayersPanel({
  players,
  hostClientId,
  drawerId,
  meClientId,
}: {
  players: Player[];
  hostClientId: string;
  drawerId: string | null;
  meClientId: string;
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="bg-card border-brutal shadow-brutal rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b-2 border-foreground bg-accent font-display font-bold">
        🎮 玩家 ({players.length})
      </div>
      <ul className="divide-y divide-foreground/10">
        {sorted.map((p, i) => {
          const isHost = p.client_id === hostClientId;
          const isDrawer = p.id === drawerId;
          const isMe = p.client_id === meClientId;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${isMe ? "bg-secondary/40" : ""}`}
            >
              <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: p.color }}
              />
              <span className="font-semibold truncate flex-1">
                {p.name} {isMe && <span className="text-xs text-muted-foreground">(你)</span>}
              </span>
              {isHost && <Crown className="w-3.5 h-3.5 text-secondary-foreground" />}
              {isDrawer && <Pencil className="w-3.5 h-3.5 text-primary" />}
              {p.guessed_correctly && <Check className="w-3.5 h-3.5 text-accent" />}
              <span className="font-mono font-bold tabular-nums">{p.score}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}