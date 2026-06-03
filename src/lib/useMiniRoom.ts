import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getClientId, getSavedName, getSavedAvatar } from "@/lib/game";

export type MiniPlayer = { client_id: string; name: string; avatar: string; score: number };
export type MiniRoom = {
  id: string;
  code: string;
  game_type: string;
  state: any;
  players: MiniPlayer[];
  host_client_id: string;
  updated_at: string;
};

export function useMiniRoom(code: string) {
  const [room, setRoom] = useState<MiniRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const meId = typeof window !== "undefined" ? getClientId() : "";

  // initial fetch + join
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data, error } = await supabase
        .from("mini_rooms")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setError("找不到房間");
        setLoading(false);
        return;
      }
      const players = ((data.players as unknown) as MiniPlayer[]) ?? [];
      if (!players.find((p) => p.client_id === meId)) {
        const me: MiniPlayer = {
          client_id: meId,
          name: getSavedName() || "玩家",
          avatar: getSavedAvatar(),
          score: 0,
        };
        const next = [...players, me];
        await supabase.from("mini_rooms").update({ players: next, updated_at: new Date().toISOString() }).eq("id", data.id);
        setRoom({ ...((data as unknown) as MiniRoom), players: next });
      } else {
        setRoom((data as unknown) as MiniRoom);
      }
      setLoading(false);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [code, meId]);

  // realtime
  useEffect(() => {
    if (!room?.id) return;
    const ch = supabase
      .channel(`mini:${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mini_rooms", filter: `id=eq.${room.id}` },
        (payload) => setRoom((prev) => (prev ? { ...prev, ...(payload.new as any) } : (payload.new as MiniRoom))),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [room?.id]);

  const update = useCallback(
    async (patch: { state?: any; players?: MiniPlayer[] }) => {
      if (!room) return;
      const body: any = { updated_at: new Date().toISOString() };
      if (patch.state !== undefined) body.state = patch.state;
      if (patch.players !== undefined) body.players = patch.players;
      // optimistic
      setRoom((prev) => (prev ? { ...prev, ...patch } as MiniRoom : prev));
      await supabase.from("mini_rooms").update(body).eq("id", room.id);
    },
    [room],
  );

  return { room, loading, error, meId, update };
}