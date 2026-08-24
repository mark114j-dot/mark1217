// Host-side of the multiplayer bridge. Runs on the page that embeds a published game
// and performs all realtime networking on behalf of the sandboxed iframe.
import { supabase } from "@/integrations/supabase/client";

export type NetPlayer = { id: string; name: string; avatar: string; ready: boolean; joinedAt: number };

export type NetHostOptions = {
  iframe: HTMLIFrameElement;
  roomCode: string;
  gameType: string;
  me: { id: string; name: string; avatar: string };
  onPlayers?: (players: NetPlayer[]) => void;
  onActive?: () => void;
  onStatus?: (s: "connecting" | "connected" | "disconnected") => void;
};

export function createNetHost(opts: NetHostOptions) {
  const { iframe, roomCode, gameType, me } = opts;
  const joinedAt = Date.now();
  let players: NetPlayer[] = [];
  let state: Record<string, unknown> = {};
  let ready = false;
  let disposed = false;

  const post = (type: string, payload: unknown) => {
    iframe.contentWindow?.postMessage({ __nethost: true, type, payload }, "*");
  };

  const channel = supabase.channel(`netgame:${gameType}:${roomCode}`, {
    config: { presence: { key: me.id }, broadcast: { self: false } },
  });

  function syncPlayers() {
    const raw = channel.presenceState() as Record<string, any[]>;
    const list: NetPlayer[] = [];
    for (const key of Object.keys(raw)) {
      const p = raw[key]?.[0];
      if (!p) continue;
      list.push({
        id: p.id ?? key,
        name: p.name ?? "玩家",
        avatar: p.avatar ?? "🐱",
        ready: !!p.ready,
        joinedAt: p.joinedAt ?? 0,
      });
    }
    list.sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
    players = list;
    opts.onPlayers?.(players);
    post("players", players);
  }

  channel
    .on("presence", { event: "sync" }, syncPlayers)
    .on("broadcast", { event: "evt" }, ({ payload }) => post("event", payload))
    .on("broadcast", { event: "state" }, ({ payload }) => {
      state = payload as Record<string, unknown>;
      post("state", state);
    })
    .on("broadcast", { event: "start" }, ({ payload }) => post("start", payload))
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        opts.onStatus?.("connected");
        await channel.track({ ...me, ready, joinedAt });
        // Load any persisted room state so late joiners / reconnects catch up.
        const { data } = await supabase
          .from("mini_rooms").select("state").eq("code", roomCode).maybeSingle();
        if (data?.state && typeof data.state === "object") state = data.state as Record<string, unknown>;
        if (!disposed) post("init", { me: me.id, players, state });
        opts.onActive?.();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        opts.onStatus?.("disconnected");
      }
    });

  async function persistState() {
    const isHost = players[0]?.id === me.id;
    if (!isHost) return;
    await supabase.from("mini_rooms").upsert(
      { code: roomCode, game_type: gameType, state: state as any, players: players as any, host_client_id: me.id },
      { onConflict: "code" },
    );
  }

  function onMessage(e: MessageEvent) {
    if (e.source !== iframe.contentWindow) return;
    const m = e.data;
    if (!m || m.__net !== true) return;
    if (m.type === "init") {
      post("init", { me: me.id, players, state });
    } else if (m.type === "event") {
      channel.send({ type: "broadcast", event: "evt", payload: m.payload });
      post("event", m.payload); // echo locally
    } else if (m.type === "state") {
      state = m.payload ?? {};
      channel.send({ type: "broadcast", event: "state", payload: state });
      void persistState();
    } else if (m.type === "start") {
      channel.send({ type: "broadcast", event: "start", payload: m.payload });
      post("start", m.payload);
    } else if (m.type === "ready") {
      ready = !!m.payload?.ready;
      void channel.track({ ...me, ready, joinedAt });
    } else if (m.type === "leave") {
      void channel.untrack();
    }
  }

  window.addEventListener("message", onMessage);
  opts.onStatus?.("connecting");

  return () => {
    disposed = true;
    window.removeEventListener("message", onMessage);
    supabase.removeChannel(channel);
  };
}

export function randomRoomCode() {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}
