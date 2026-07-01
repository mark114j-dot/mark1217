import { useEffect, useState, type ReactElement } from "react";
import type { MiniRoom, MiniPlayer } from "@/lib/useMiniRoom";
import { sfx } from "@/lib/sfx";

type GameProps = {
  room: MiniRoom;
  meId: string;
  update: (patch: { state?: any; players?: MiniPlayer[] }) => Promise<void>;
};

function WaitingForPlayers({ needed }: { needed: number }) {
  return (
    <div className="bg-card border-brutal shadow-brutal rounded-2xl p-8 text-center">
      <div className="text-5xl mb-3 animate-pulse">⏳</div>
      <p className="font-display font-bold text-lg">等待玩家加入…</p>
      <p className="text-sm text-muted-foreground mt-1">至少需要 {needed} 位玩家，把房號分享給朋友！</p>
    </div>
  );
}

function Banner({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "win" | "lose" | "info" }) {
  const cls =
    tone === "win"
      ? "bg-accent/40 border-accent"
      : tone === "lose"
        ? "bg-destructive/20 border-destructive"
        : tone === "info"
          ? "bg-secondary/40 border-secondary"
          : "bg-card";
  return <div className={`border-brutal rounded-xl px-4 py-2 font-bold text-center ${cls}`}>{children}</div>;
}

function addScore(players: MiniPlayer[], clientId: string, delta: number) {
  return players.map((p) => (p.client_id === clientId ? { ...p, score: p.score + delta } : p));
}

/* ───────────────────── 1. Tic-Tac-Toe ───────────────────── */
function TicTacToe({ room, meId, update }: GameProps) {
  const s = room.state as { board?: (string | null)[]; turn?: string; winner?: string | null };
  const board = s.board ?? Array(9).fill(null);
  const turn = s.turn ?? room.players[0]?.client_id;
  const winner = s.winner ?? null;

  const p1 = room.players[0];
  const p2 = room.players[1];
  if (!p1 || !p2) return <WaitingForPlayers needed={2} />;
  const myMark = meId === p1.client_id ? "X" : meId === p2.client_id ? "O" : null;

  function checkWin(b: (string | null)[]) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b1,c] of lines) if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
    if (b.every(Boolean)) return "draw";
    return null;
  }

  async function play(i: number) {
    if (winner || board[i] || turn !== meId || !myMark) return;
    const nb = [...board]; nb[i] = myMark;
    const w = checkWin(nb);
    const players = w && w !== "draw" ? addScore(room.players, meId, 1) : room.players;
    await update({
      state: { board: nb, turn: turn === p1.client_id ? p2.client_id : p1.client_id, winner: w },
      ...(w && w !== "draw" ? { players } : {}),
    });
  }

  async function reset() {
    await update({ state: { board: Array(9).fill(null), turn: winner === "X" ? p2.client_id : p1.client_id, winner: null } });
  }

  return (
    <div className="space-y-3">
      <Banner tone={winner ? "win" : "info"}>
        {winner === "draw" ? "平手！" : winner ? `${winner === "X" ? p1.name : p2.name} 獲勝！🎉` : turn === meId ? `輪到你 (${myMark})` : `等待 ${turn === p1.client_id ? p1.name : p2.name}…`}
      </Banner>
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {board.map((c, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            className="aspect-square border-brutal shadow-brutal-sm rounded-xl bg-card text-5xl font-black hover:translate-y-0.5 hover:shadow-none transition disabled:opacity-60"
            disabled={!!c || !!winner || turn !== meId}
          >
            <span className={c === "X" ? "text-primary" : "text-accent-foreground"}>{c}</span>
          </button>
        ))}
      </div>
      {winner && (
        <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold hover:translate-y-0.5 hover:shadow-none transition">
          再來一局
        </button>
      )}
    </div>
  );
}

/* ───────────────────── 2. Gomoku (15x15) ───────────────────── */
function Gomoku({ room, meId, update }: GameProps) {
  const N = 15;
  const s = room.state as { board?: (string | null)[]; turn?: string; winner?: string | null; last?: number };
  const board = s.board ?? Array(N * N).fill(null);
  const turn = s.turn ?? room.players[0]?.client_id;
  const winner = s.winner ?? null;
  const p1 = room.players[0]; const p2 = room.players[1];
  if (!p1 || !p2) return <WaitingForPlayers needed={2} />;
  const myMark = meId === p1.client_id ? "●" : meId === p2.client_id ? "○" : null;

  function check(b: (string | null)[], idx: number) {
    const x = idx % N; const y = Math.floor(idx / N); const m = b[idx];
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (const [dx, dy] of dirs) {
      let cnt = 1;
      for (let s = 1; s < 5; s++) { const nx = x + dx*s, ny = y + dy*s; if (nx<0||nx>=N||ny<0||ny>=N) break; if (b[ny*N+nx]!==m) break; cnt++; }
      for (let s = 1; s < 5; s++) { const nx = x - dx*s, ny = y - dy*s; if (nx<0||nx>=N||ny<0||ny>=N) break; if (b[ny*N+nx]!==m) break; cnt++; }
      if (cnt >= 5) return m;
    }
    return null;
  }

  async function play(i: number) {
    if (winner || board[i] || turn !== meId || !myMark) return;
    const nb = [...board]; nb[i] = myMark;
    const w = check(nb, i);
    await update({
      state: { board: nb, turn: turn === p1.client_id ? p2.client_id : p1.client_id, winner: w, last: i },
      ...(w ? { players: addScore(room.players, meId, 1) } : {}),
    });
  }

  async function reset() {
    await update({ state: { board: Array(N*N).fill(null), turn: p1.client_id, winner: null, last: -1 } });
  }

  return (
    <div className="space-y-3">
      <Banner tone={winner ? "win" : "info"}>
        {winner ? `${winner === "●" ? p1.name : p2.name} 連五子勝利！🎉` : turn === meId ? `輪到你 (${myMark})` : `等待對手…`}
      </Banner>
      <div className="bg-amber-100 dark:bg-amber-900/30 border-brutal shadow-brutal rounded-xl p-1.5 overflow-auto">
        <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`, minWidth: 360 }}>
          {board.map((c, i) => (
            <button
              key={i}
              onClick={() => play(i)}
              className="aspect-square border border-amber-900/30 text-base sm:text-lg leading-none flex items-center justify-center hover:bg-amber-200/50"
              disabled={!!c || !!winner || turn !== meId}
            >
              <span className={c === "●" ? "text-black" : "text-white drop-shadow"}>{c}</span>
            </button>
          ))}
        </div>
      </div>
      {winner && <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">再來一局</button>}
    </div>
  );
}

/* ───────────────────── 3. Reversi 8x8 ───────────────────── */
function Reversi({ room, meId, update }: GameProps) {
  const N = 8;
  function initBoard(): (number | null)[] {
    const b = Array(N * N).fill(null);
    b[3*N+3] = 1; b[4*N+4] = 1; b[3*N+4] = 2; b[4*N+3] = 2;
    return b;
  }
  const s = room.state as { board?: (number | null)[]; turn?: string; passes?: number };
  const board = s.board ?? initBoard();
  const p1 = room.players[0]; const p2 = room.players[1];
  if (!p1 || !p2) return <WaitingForPlayers needed={2} />;
  const turn = s.turn ?? p1.client_id;
  const myColor = meId === p1.client_id ? 1 : meId === p2.client_id ? 2 : null;
  const turnColor = turn === p1.client_id ? 1 : 2;
  const passes = s.passes ?? 0;

  function flips(b: (number|null)[], idx: number, color: number) {
    if (b[idx] !== null) return [];
    const x = idx % N, y = Math.floor(idx / N);
    const opp = color === 1 ? 2 : 1;
    const out: number[] = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const line: number[] = [];
      let nx = x+dx, ny = y+dy;
      while (nx>=0&&nx<N&&ny>=0&&ny<N&&b[ny*N+nx]===opp) { line.push(ny*N+nx); nx+=dx; ny+=dy; }
      if (line.length && nx>=0&&nx<N&&ny>=0&&ny<N&&b[ny*N+nx]===color) out.push(...line);
    }
    return out;
  }

  function hasMove(b: (number|null)[], color: number) {
    for (let i = 0; i < N*N; i++) if (flips(b, i, color).length) return true;
    return false;
  }

  async function play(i: number) {
    if (turn !== meId || !myColor) return;
    const fl = flips(board, i, myColor);
    if (!fl.length) return;
    const nb = [...board]; nb[i] = myColor; fl.forEach((j) => (nb[j] = myColor));
    const nextColor = myColor === 1 ? 2 : 1;
    const nextTurn = hasMove(nb, nextColor) ? (turn === p1.client_id ? p2.client_id : p1.client_id) : hasMove(nb, myColor) ? meId : "__end__";
    await update({ state: { board: nb, turn: nextTurn, passes: 0 } });
  }

  const c1 = board.filter((x) => x === 1).length;
  const c2 = board.filter((x) => x === 2).length;
  const ended = turn === "__end__" || (c1 + c2 === N*N);
  const winnerLabel = ended ? (c1 > c2 ? `${p1.name} 勝！` : c2 > c1 ? `${p2.name} 勝！` : "平手") : null;

  async function reset() {
    if (ended && !s.passes) {
      const winner = c1 > c2 ? p1.client_id : c2 > c1 ? p2.client_id : null;
      await update({
        state: { board: initBoard(), turn: p1.client_id, passes: 1 },
        ...(winner ? { players: addScore(room.players, winner, 1) } : {}),
      });
    } else {
      await update({ state: { board: initBoard(), turn: p1.client_id, passes: 0 } });
    }
  }

  return (
    <div className="space-y-3">
      <Banner tone={ended ? "win" : "info"}>
        {ended ? winnerLabel : turn === meId ? `輪到你（${myColor === 1 ? "⚫" : "⚪"}）` : "等待對手…"}
        　⚫{c1} ⚪{c2}
      </Banner>
      <div className="bg-emerald-700 border-brutal shadow-brutal rounded-xl p-2 max-w-md mx-auto">
        <div className="grid grid-cols-8 gap-1">
          {board.map((c, i) => {
            const can = !ended && turn === meId && myColor && flips(board, i, myColor).length > 0;
            return (
              <button key={i} onClick={() => play(i)} className={`aspect-square rounded bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-2xl ${can ? "ring-2 ring-yellow-300" : ""}`}>
                {c === 1 ? "⚫" : c === 2 ? "⚪" : ""}
              </button>
            );
          })}
        </div>
      </div>
      {ended && <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">再來一局</button>}
    </div>
  );
}

/* ───────────────────── 4. Connect 4 ───────────────────── */
function Connect4({ room, meId, update }: GameProps) {
  const R = 6, C = 7;
  const s = room.state as { board?: (string | null)[]; turn?: string; winner?: string | null };
  const board = s.board ?? Array(R * C).fill(null);
  const p1 = room.players[0]; const p2 = room.players[1];
  if (!p1 || !p2) return <WaitingForPlayers needed={2} />;
  const turn = s.turn ?? p1.client_id;
  const myColor = meId === p1.client_id ? "🔴" : meId === p2.client_id ? "🟡" : null;
  const winner = s.winner ?? null;

  function checkWin(b: (string|null)[]) {
    const at = (r:number,c:number) => b[r*C+c];
    for (let r=0;r<R;r++) for (let c=0;c<C;c++) {
      const m = at(r,c); if (!m) continue;
      for (const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
        let ok = true;
        for (let k=1;k<4;k++){ const nr=r+dr*k,nc=c+dc*k; if(nr<0||nr>=R||nc<0||nc>=C||at(nr,nc)!==m){ok=false;break;} }
        if (ok) return m;
      }
    }
    if (b.every(Boolean)) return "draw";
    return null;
  }

  async function drop(col: number) {
    if (winner || turn !== meId || !myColor) return;
    let row = -1;
    for (let r = R - 1; r >= 0; r--) if (!board[r*C+col]) { row = r; break; }
    if (row < 0) return;
    const nb = [...board]; nb[row*C+col] = myColor;
    const w = checkWin(nb);
    await update({
      state: { board: nb, turn: turn === p1.client_id ? p2.client_id : p1.client_id, winner: w },
      ...(w && w !== "draw" ? { players: addScore(room.players, meId, 1) } : {}),
    });
  }

  async function reset() {
    await update({ state: { board: Array(R*C).fill(null), turn: p1.client_id, winner: null } });
  }

  return (
    <div className="space-y-3">
      <Banner tone={winner ? "win" : "info"}>
        {winner === "draw" ? "平手！" : winner ? `${winner === "🔴" ? p1.name : p2.name} 連四勝利！🎉` : turn === meId ? `輪到你 (${myColor})` : "等待對手…"}
      </Banner>
      <div className="bg-blue-600 border-brutal shadow-brutal rounded-xl p-2 max-w-md mx-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${C},minmax(0,1fr))` }}>
          {Array.from({ length: C }).map((_, c) => (
            <button key={`h${c}`} onClick={() => drop(c)} className="text-white text-xl py-1 rounded hover:bg-blue-500 disabled:opacity-30" disabled={!!winner || turn !== meId}>⬇</button>
          ))}
          {board.map((cell, i) => (
            <div key={i} className="aspect-square rounded-full bg-blue-800 flex items-center justify-center text-2xl">{cell}</div>
          ))}
        </div>
      </div>
      {winner && <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">再來一局</button>}
    </div>
  );
}

/* ───────────────────── 5. Rock-Paper-Scissors ───────────────────── */
function RPS({ room, meId, update }: GameProps) {
  const s = room.state as { picks?: Record<string, string>; round?: number; max?: number; lastResult?: string };
  const picks = s.picks ?? {};
  const round = s.round ?? 1;
  const max = s.max ?? 5;
  const p1 = room.players[0]; const p2 = room.players[1];
  if (!p1 || !p2) return <WaitingForPlayers needed={2} />;
  const myPick = picks[meId];
  const both = picks[p1.client_id] && picks[p2.client_id];

  async function pick(c: string) {
    if (myPick || both) return;
    await update({ state: { ...s, picks: { ...picks, [meId]: c }, round, max } });
  }

  async function nextRound() {
    const a = picks[p1.client_id]; const b = picks[p2.client_id];
    const beats: Record<string,string> = { rock: "scissors", paper: "rock", scissors: "paper" };
    let winnerId: string | null = null;
    if (a && b && a !== b) winnerId = beats[a] === b ? p1.client_id : p2.client_id;
    const newPlayers = winnerId ? addScore(room.players, winnerId, 1) : room.players;
    const done = round >= max;
    const result = winnerId ? `${winnerId === p1.client_id ? p1.name : p2.name} 贏這局！` : "平手";
    if (done) {
      await update({
        state: { picks: {}, round: 1, max, lastResult: "結束！" },
        players: newPlayers,
      });
    } else {
      await update({ state: { picks: {}, round: round + 1, max, lastResult: result }, players: newPlayers });
    }
  }

  const choices: [string,string][] = [["rock","✊"],["paper","✋"],["scissors","✌️"]];
  return (
    <div className="space-y-3">
      <Banner tone="info">第 {round} / {max} 局　{s.lastResult ?? ""}</Banner>
      <div className="grid grid-cols-2 gap-3">
        {[p1, p2].map((p) => (
          <div key={p.client_id} className="border-brutal shadow-brutal-sm rounded-xl p-4 bg-card text-center">
            <div className="text-xs text-muted-foreground">{p.name}{p.client_id===meId?" (你)":""}</div>
            <div className="text-5xl my-2">
              {both ? choices.find(([k])=>k===picks[p.client_id])?.[1] : picks[p.client_id] ? "❓" : "…"}
            </div>
          </div>
        ))}
      </div>
      {!both && !myPick && (
        <div className="flex gap-2 justify-center">
          {choices.map(([k,e]) => (
            <button key={k} onClick={() => pick(k)} className="border-brutal shadow-brutal-sm rounded-xl p-4 bg-card text-4xl hover:translate-y-0.5 hover:shadow-none transition">{e}</button>
          ))}
        </div>
      )}
      {both && (
        <button onClick={nextRound} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">下一局</button>
      )}
    </div>
  );
}

/* ───────────────────── 6. Memory Match ───────────────────── */
function Memory({ room, meId, update }: GameProps) {
  const EMOJIS = ["🐱","🐶","🦊","🦁","🐸","🐼","🐵","🦄"];
  function deal() {
    const arr = [...EMOJIS, ...EMOJIS].map((e, i) => ({ e, id: i }));
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    return arr;
  }
  const s = room.state as { cards?: {e:string;id:number}[]; flipped?: number[]; matched?: number[]; turn?: string; scores?: Record<string,number> };
  const cards = s.cards ?? [];
  const flipped = s.flipped ?? [];
  const matched = s.matched ?? [];
  const p1 = room.players[0]; const p2 = room.players[1];
  if (!p1 || !p2) return <WaitingForPlayers needed={2} />;
  const turn = s.turn ?? p1.client_id;
  const scores = s.scores ?? { [p1.client_id]: 0, [p2.client_id]: 0 };

  useEffect(() => {
    if (!cards.length && meId === room.host_client_id) {
      update({ state: { cards: deal(), flipped: [], matched: [], turn: p1.client_id, scores: { [p1.client_id]: 0, [p2.client_id]: 0 } } });
    }
  }, [cards.length]);

  async function flip(i: number) {
    if (turn !== meId || flipped.includes(i) || matched.includes(i) || flipped.length >= 2) return;
    const nf = [...flipped, i];
    if (nf.length < 2) { await update({ state: { ...s, flipped: nf } }); return; }
    const [a,b] = nf;
    if (cards[a].e === cards[b].e) {
      const nm = [...matched, a, b];
      const ns = { ...scores, [meId]: (scores[meId] ?? 0) + 1 };
      const done = nm.length === cards.length;
      await update({
        state: { ...s, flipped: [], matched: nm, scores: ns, turn: meId },
        ...(done ? { players: addScore(room.players, (ns[p1.client_id] ?? 0) > (ns[p2.client_id] ?? 0) ? p1.client_id : (ns[p2.client_id] ?? 0) > (ns[p1.client_id] ?? 0) ? p2.client_id : meId, 1) } : {}),
      });
    } else {
      await update({ state: { ...s, flipped: nf } });
      setTimeout(() => { update({ state: { ...s, flipped: [], turn: turn === p1.client_id ? p2.client_id : p1.client_id } }); }, 900);
    }
  }

  const done = cards.length > 0 && matched.length === cards.length;

  async function reset() {
    await update({ state: { cards: deal(), flipped: [], matched: [], turn: p1.client_id, scores: { [p1.client_id]: 0, [p2.client_id]: 0 } } });
  }

  return (
    <div className="space-y-3">
      <Banner tone={done ? "win" : "info"}>
        {done ? "本局結束！" : turn === meId ? "輪到你翻牌" : "等待對手…"}　
        ⭐ {p1.name}: {scores[p1.client_id] ?? 0}　{p2.name}: {scores[p2.client_id] ?? 0}
      </Banner>
      <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
        {cards.map((c, i) => {
          const shown = flipped.includes(i) || matched.includes(i);
          return (
            <button key={i} onClick={() => flip(i)} disabled={shown} className="aspect-square border-brutal shadow-brutal-sm rounded-xl bg-card text-3xl flex items-center justify-center hover:translate-y-0.5 hover:shadow-none transition">
              {shown ? c.e : "❓"}
            </button>
          );
        })}
      </div>
      {done && <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">再來一局</button>}
    </div>
  );
}

/* ───────────────────── 7. Dice ───────────────────── */
function Dice({ room, meId, update }: GameProps) {
  const s = room.state as { rolls?: Record<string, number>; round?: number };
  const rolls = s.rolls ?? {};
  const round = s.round ?? 1;
  if (room.players.length < 2) return <WaitingForPlayers needed={2} />;
  const allRolled = room.players.every((p) => typeof rolls[p.client_id] === "number");
  const myRoll = rolls[meId];

  async function roll() {
    if (myRoll) return;
    const v = Math.floor(Math.random() * 6) + 1;
    await update({ state: { rolls: { ...rolls, [meId]: v }, round } });
  }

  async function next() {
    const max = Math.max(...room.players.map((p) => rolls[p.client_id] ?? 0));
    const winners = room.players.filter((p) => rolls[p.client_id] === max);
    let players = room.players;
    if (winners.length === 1) players = addScore(players, winners[0].client_id, 1);
    await update({ state: { rolls: {}, round: round + 1 }, players });
  }

  const faces = ["","⚀","⚁","⚂","⚃","⚄","⚅"];
  return (
    <div className="space-y-3">
      <Banner tone="info">第 {round} 回合 — 比點數大！</Banner>
      <div className="grid sm:grid-cols-2 gap-3">
        {room.players.map((p) => (
          <div key={p.client_id} className="border-brutal shadow-brutal-sm rounded-xl p-4 bg-card text-center">
            <div className="text-sm font-bold">{p.avatar} {p.name}{p.client_id===meId?" (你)":""}</div>
            <div className="text-7xl my-2">{rolls[p.client_id] ? faces[rolls[p.client_id]] : "🎲"}</div>
            <div className="text-xs text-muted-foreground">{rolls[p.client_id] ?? "尚未擲骰"}</div>
          </div>
        ))}
      </div>
      {!myRoll && <button onClick={roll} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-3 bg-primary text-primary-foreground font-bold text-lg">🎲 擲骰子</button>}
      {allRolled && <button onClick={next} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-accent font-bold">下一回合</button>}
    </div>
  );
}

/* ───────────────────── 8. Number Guess (終極密碼) ───────────────────── */
function NumberGuess({ room, meId, update }: GameProps) {
  const s = room.state as { secret?: number; lo?: number; hi?: number; turn?: string; loserId?: string | null; history?: { name: string; n: number }[] };
  if (room.players.length < 2) return <WaitingForPlayers needed={2} />;
  const p1 = room.players[0];

  useEffect(() => {
    if (s.secret === undefined && meId === room.host_client_id) {
      update({ state: { secret: Math.floor(Math.random()*99)+1, lo: 1, hi: 100, turn: p1.client_id, loserId: null, history: [] } });
    }
  }, [s.secret]);

  const lo = s.lo ?? 1; const hi = s.hi ?? 100;
  const turn = s.turn ?? p1.client_id;
  const loserId = s.loserId ?? null;
  const [val, setVal] = useState("");
  const me = room.players.find((p) => p.client_id === meId);

  async function guess() {
    const n = parseInt(val);
    if (!n || n <= lo || n >= hi || turn !== meId) return;
    setVal("");
    const history = [...(s.history ?? []), { name: me?.name ?? "?", n }];
    if (n === s.secret) {
      const players = addScore(room.players, room.players.find((p) => p.client_id !== meId)!.client_id, 1);
      await update({ state: { ...s, loserId: meId, history }, players });
      return;
    }
    const newLo = n < (s.secret ?? 0) ? n : lo;
    const newHi = n > (s.secret ?? 0) ? n : hi;
    const idx = room.players.findIndex((p) => p.client_id === turn);
    const next = room.players[(idx + 1) % room.players.length].client_id;
    await update({ state: { ...s, lo: newLo, hi: newHi, turn: next, history } });
  }

  async function reset() {
    await update({ state: { secret: Math.floor(Math.random()*99)+1, lo: 1, hi: 100, turn: p1.client_id, loserId: null, history: [] } });
  }

  const turnName = room.players.find((p) => p.client_id === turn)?.name;

  return (
    <div className="space-y-3">
      <Banner tone={loserId ? "lose" : "info"}>
        {loserId ? `💥 ${room.players.find(p=>p.client_id===loserId)?.name} 猜中地雷（${s.secret}）！` : `範圍 ${lo} ~ ${hi}　輪到 ${turnName}${turn===meId?" (你)":""}`}
      </Banner>
      {!loserId && turn === meId && (
        <div className="flex gap-2 max-w-sm mx-auto">
          <input type="number" value={val} onChange={(e) => setVal(e.target.value)} min={lo+1} max={hi-1} placeholder={`輸入 ${lo+1} ~ ${hi-1}`} className="flex-1 border-2 border-foreground/40 rounded-lg px-3 py-2 focus:outline-none focus:border-foreground" />
          <button onClick={guess} className="border-brutal shadow-brutal-sm rounded-lg px-4 bg-primary text-primary-foreground font-bold">猜！</button>
        </div>
      )}
      {(s.history ?? []).length > 0 && (
        <div className="bg-card border-brutal shadow-brutal-sm rounded-xl p-3 max-w-sm mx-auto text-sm space-y-1">
          {(s.history ?? []).slice(-8).map((h, i) => <div key={i}><b>{h.name}</b>：{h.n}</div>)}
        </div>
      )}
      {loserId && <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">再來一局</button>}
    </div>
  );
}

/* ───────────────────── 9. Word Chain (文字接龍) ───────────────────── */
function WordChain({ room, meId, update }: GameProps) {
  const s = room.state as { words?: { name: string; w: string }[]; turn?: string; used?: string[]; deadline?: number };
  if (room.players.length < 2) return <WaitingForPlayers needed={2} />;
  const p1 = room.players[0];
  const words = s.words ?? [];
  const turn = s.turn ?? p1.client_id;
  const used = s.used ?? [];
  const last = words[words.length - 1]?.w;
  const me = room.players.find((p) => p.client_id === meId);
  const [val, setVal] = useState("");

  async function submit() {
    const w = val.trim();
    if (!w || turn !== meId) return;
    if (used.includes(w)) { setVal(""); return; }
    if (last && w[0] !== last[last.length - 1]) { return; }
    setVal("");
    const idx = room.players.findIndex((p) => p.client_id === turn);
    const next = room.players[(idx + 1) % room.players.length].client_id;
    await update({ state: { words: [...words, { name: me?.name ?? "?", w }], used: [...used, w], turn: next }, players: addScore(room.players, meId, 1) });
  }

  async function reset() { await update({ state: { words: [], used: [], turn: p1.client_id } }); }

  const turnName = room.players.find((p) => p.client_id === turn)?.name;
  return (
    <div className="space-y-3">
      <Banner tone="info">{last ? `接上一字：「${last[last.length-1]}」開頭` : "第一個人隨意出題"}　|　輪到 {turnName}{turn===meId?" (你)":""}</Banner>
      {turn === meId && (
        <div className="flex gap-2 max-w-sm mx-auto">
          <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} maxLength={20} placeholder="輸入詞語" className="flex-1 border-2 border-foreground/40 rounded-lg px-3 py-2 focus:outline-none focus:border-foreground" />
          <button onClick={submit} className="border-brutal shadow-brutal-sm rounded-lg px-4 bg-primary text-primary-foreground font-bold">接！</button>
        </div>
      )}
      <div className="bg-card border-brutal shadow-brutal-sm rounded-xl p-3 max-w-md mx-auto text-sm space-y-1 max-h-72 overflow-auto">
        {words.length === 0 && <p className="text-muted-foreground text-center">尚無詞語</p>}
        {words.map((w, i) => <div key={i}><b>{w.name}：</b>{w.w}</div>)}
      </div>
      <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-4 py-1.5 bg-secondary font-bold text-sm">重置</button>
    </div>
  );
}

/* ───────────────────── 10. Snap (心臟病) ───────────────────── */
function Snap({ room, meId, update }: GameProps) {
  // simple version: server rotates a current card; if rank is ACE (1), first to tap wins point
  const s = room.state as { card?: number; flippedAt?: number; tappedBy?: string | null };
  const card = s.card;
  const tappedBy = s.tappedBy ?? null;
  if (room.players.length < 2) return <WaitingForPlayers needed={2} />;

  async function flip() {
    const next = Math.floor(Math.random() * 13) + 1;
    await update({ state: { card: next, flippedAt: Date.now(), tappedBy: null } });
  }

  async function tap() {
    if (!card || tappedBy) return;
    const correct = card === 1;
    const players = correct ? addScore(room.players, meId, 1) : addScore(room.players, meId, -1);
    await update({ state: { card, flippedAt: s.flippedAt, tappedBy: meId }, players });
  }

  const rank = card ? (card === 1 ? "A" : card === 11 ? "J" : card === 12 ? "Q" : card === 13 ? "K" : `${card}`) : null;
  const tapper = room.players.find((p) => p.client_id === tappedBy);

  return (
    <div className="space-y-3">
      <Banner tone="info">看到 <b>A</b> 立刻拍！拍錯扣分。</Banner>
      <div className="mx-auto w-48 h-64 border-brutal shadow-brutal rounded-2xl bg-card flex items-center justify-center text-7xl font-black">
        {rank ?? "🂠"}
      </div>
      {tapper && (
        <Banner tone={card === 1 ? "win" : "lose"}>
          {tapper.name} 拍下！{card === 1 ? "✅ 正確 +1" : "❌ 拍錯 -1"}
        </Banner>
      )}
      <div className="flex gap-2 justify-center">
        <button onClick={flip} className="border-brutal shadow-brutal-sm rounded-xl px-5 py-2 bg-secondary font-bold hover:translate-y-0.5 hover:shadow-none transition">🔄 翻下一張</button>
        <button onClick={tap} disabled={!card || !!tappedBy} className="border-brutal shadow-brutal rounded-xl px-8 py-2 bg-destructive text-destructive-foreground font-black text-lg hover:translate-y-0.5 hover:shadow-none transition disabled:opacity-50">
          ❤️ 拍！
        </button>
      </div>
    </div>
  );
}

export const GAME_COMPONENTS: Record<string, (p: GameProps) => ReactElement> = {
  tictactoe: TicTacToe,
  gomoku: Gomoku,
  reversi: Reversi,
  connect4: Connect4,
  rps: RPS,
  memory: Memory,
  dice: Dice,
  numberguess: NumberGuess,
  wordchain: WordChain,
  snap: Snap,
  quickdraw: QuickDraw,
  nim: Nim,
  coinflip: CoinFlip,
  highlow: HighLow,
  dotsboxes: DotsBoxes,
  treasure: Treasure,
  mathrace: MathRace,
  typing: Typing,
  bingo: Bingo,
  hangman: Hangman,
  speedsum: SpeedSum,
  dicepoker: DicePoker,
  oddone: OddOne,
};

/* ───────────────────── 11. QuickDraw (牛仔對決) ───────────────────── */
function QuickDraw({ room, meId, update }: GameProps) {
  const s = room.state as { phase?: "idle"|"ready"|"go"; goAt?: number; winnerId?: string | null; falseBy?: string | null };
  const phase = s.phase ?? "idle";
  if (room.players.length < 2) return <WaitingForPlayers needed={2} />;
  const isHost = meId === room.host_client_id;

  useEffect(() => {
    if (phase === "ready" && isHost && s.goAt) {
      const t = setTimeout(() => update({ state: { phase: "go", goAt: Date.now(), winnerId: null, falseBy: null } }), Math.max(0, s.goAt - Date.now()));
      return () => clearTimeout(t);
    }
  }, [phase, s.goAt]);

  async function start() {
    const delay = 1500 + Math.floor(Math.random() * 4000);
    await update({ state: { phase: "ready", goAt: Date.now() + delay, winnerId: null, falseBy: null } });
  }
  async function tap() {
    if (phase === "ready" && !s.falseBy) {
      const players = addScore(room.players, meId, -1);
      await update({ state: { ...s, phase: "idle", falseBy: meId }, players });
      return;
    }
    if (phase === "go" && !s.winnerId) {
      const players = addScore(room.players, meId, 1);
      await update({ state: { ...s, phase: "idle", winnerId: meId }, players });
    }
  }

  return (
    <div className="space-y-3">
      <Banner tone={phase === "go" ? "win" : phase === "ready" ? "lose" : "info"}>
        {phase === "ready" ? "🤠 準備…別亂拍！" : phase === "go" ? "🔥 GO！立刻拍！" : s.winnerId ? `${room.players.find(p=>p.client_id===s.winnerId)?.name} 最快！+1` : s.falseBy ? `${room.players.find(p=>p.client_id===s.falseBy)?.name} 偷跑 -1` : "按開始等候 GO"}
      </Banner>
      <div onClick={tap} className={`mx-auto w-72 h-48 rounded-2xl border-brutal shadow-brutal flex items-center justify-center text-7xl font-black cursor-pointer ${phase==="go"?"bg-accent":phase==="ready"?"bg-destructive/30":"bg-card"}`}>
        {phase === "go" ? "GO!" : phase === "ready" ? "…" : "🤠"}
      </div>
      {phase === "idle" && <button onClick={start} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">開始決鬥</button>}
    </div>
  );
}

/* ───────────────────── 12. Nim (取石頭) ───────────────────── */
function Nim({ room, meId, update }: GameProps) {
  const s = room.state as { stones?: number; turn?: string; loserId?: string | null };
  const p1 = room.players[0]; const p2 = room.players[1];
  if (!p1 || !p2) return <WaitingForPlayers needed={2} />;
  const stones = s.stones ?? 21;
  const turn = s.turn ?? p1.client_id;
  const loserId = s.loserId ?? null;

  async function take(n: number) {
    if (loserId || turn !== meId || n > stones) return;
    const left = stones - n;
    if (left === 0) {
      const winnerId = room.players.find(p => p.client_id !== meId)!.client_id;
      await update({ state: { stones: 0, turn, loserId: meId }, players: addScore(room.players, winnerId, 1) });
    } else {
      await update({ state: { stones: left, turn: turn === p1.client_id ? p2.client_id : p1.client_id, loserId: null } });
    }
  }
  async function reset() { await update({ state: { stones: 21, turn: p1.client_id, loserId: null } }); }

  return (
    <div className="space-y-3">
      <Banner tone={loserId ? "lose" : "info"}>
        {loserId ? `💥 ${room.players.find(p=>p.client_id===loserId)?.name} 拿了最後一顆，輸了！` : turn === meId ? "輪到你 — 取 1~3 顆" : "等待對手…"}
      </Banner>
      <div className="bg-card border-brutal shadow-brutal-sm rounded-xl p-4 max-w-md mx-auto text-center">
        <div className="text-3xl leading-relaxed break-words">{Array.from({length: stones}).map((_,i)=><span key={i}>🪨</span>)}</div>
        <div className="mt-2 text-sm text-muted-foreground">剩 {stones} 顆</div>
      </div>
      {!loserId && turn === meId && (
        <div className="flex gap-2 justify-center">
          {[1,2,3].map(n => (
            <button key={n} onClick={() => take(n)} disabled={n>stones} className="border-brutal shadow-brutal-sm rounded-xl px-5 py-2 bg-primary text-primary-foreground font-bold disabled:opacity-40">取 {n}</button>
          ))}
        </div>
      )}
      {loserId && <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">再來一局</button>}
    </div>
  );
}

/* ───────────────────── 13. CoinFlip (猜硬幣) ───────────────────── */
function CoinFlip({ room, meId, update }: GameProps) {
  const s = room.state as { picks?: Record<string,"H"|"T">; result?: "H"|"T"|null; round?: number; max?: number };
  const p1 = room.players[0]; const p2 = room.players[1];
  if (!p1 || !p2) return <WaitingForPlayers needed={2} />;
  const picks = s.picks ?? {};
  const round = s.round ?? 1; const max = s.max ?? 5;
  const both = picks[p1.client_id] && picks[p2.client_id];
  const result = s.result ?? null;

  async function pick(c: "H"|"T") {
    if (picks[meId] || both) return;
    await update({ state: { ...s, picks: { ...picks, [meId]: c }, round, max } });
  }
  async function flip() {
    const r: "H"|"T" = Math.random() < 0.5 ? "H" : "T";
    let players = room.players;
    if (picks[p1.client_id] === r) players = addScore(players, p1.client_id, 1);
    if (picks[p2.client_id] === r) players = addScore(players, p2.client_id, 1);
    await update({ state: { picks, result: r, round, max }, players });
  }
  async function next() {
    await update({ state: { picks: {}, result: null, round: round + 1, max } });
  }

  return (
    <div className="space-y-3">
      <Banner tone="info">第 {round} / {max} 局</Banner>
      <div className="mx-auto w-36 h-36 rounded-full border-brutal shadow-brutal bg-amber-300 dark:bg-amber-500 flex items-center justify-center text-6xl">
        {result === "H" ? "🙂" : result === "T" ? "🔢" : "🪙"}
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {[p1, p2].map(p => (
          <div key={p.client_id} className="border-brutal shadow-brutal-sm rounded-xl p-3 bg-card text-center">
            <div className="text-xs">{p.name}{p.client_id===meId?" (你)":""}</div>
            <div className="text-3xl my-1">{both || result ? (picks[p.client_id] === "H" ? "🙂 正" : "🔢 反") : picks[p.client_id] ? "❓" : "…"}</div>
          </div>
        ))}
      </div>
      {!picks[meId] && !both && (
        <div className="flex gap-2 justify-center">
          <button onClick={() => pick("H")} className="border-brutal shadow-brutal-sm rounded-xl px-5 py-2 bg-card font-bold">🙂 正面</button>
          <button onClick={() => pick("T")} className="border-brutal shadow-brutal-sm rounded-xl px-5 py-2 bg-card font-bold">🔢 反面</button>
        </div>
      )}
      {both && !result && <button onClick={flip} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">🪙 翻硬幣</button>}
      {result && <button onClick={next} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-accent font-bold">下一局</button>}
    </div>
  );
}

/* ───────────────────── 14. HighLow (比大小) ───────────────────── */
function HighLow({ room, meId, update }: GameProps) {
  const s = room.state as { card?: number; turn?: string; loserId?: string | null };
  const p1 = room.players[0]; const p2 = room.players[1];
  if (!p1 || !p2) return <WaitingForPlayers needed={2} />;
  const card = s.card ?? Math.floor(Math.random()*13)+1;
  const turn = s.turn ?? p1.client_id;
  const loserId = s.loserId ?? null;

  useEffect(() => {
    if (s.card === undefined && meId === room.host_client_id) {
      update({ state: { card, turn: p1.client_id, loserId: null } });
    }
  }, [s.card]);

  async function guess(dir: "hi"|"lo") {
    if (loserId || turn !== meId) return;
    const next = Math.floor(Math.random()*13)+1;
    const correct = next === card ? null : (dir === "hi" ? next > card : next < card);
    if (correct === false) {
      const opp = room.players.find(p=>p.client_id!==meId)!.client_id;
      await update({ state: { card: next, turn, loserId: meId }, players: addScore(room.players, opp, 1) });
    } else {
      await update({ state: { card: next, turn: turn===p1.client_id?p2.client_id:p1.client_id, loserId: null } });
    }
  }
  async function reset() { await update({ state: { card: Math.floor(Math.random()*13)+1, turn: p1.client_id, loserId: null } }); }
  const face = (n: number) => n===1?"A":n===11?"J":n===12?"Q":n===13?"K":String(n);
  const turnName = room.players.find(p=>p.client_id===turn)?.name;

  return (
    <div className="space-y-3">
      <Banner tone={loserId ? "lose" : "info"}>
        {loserId ? `${room.players.find(p=>p.client_id===loserId)?.name} 猜錯了！` : `輪到 ${turnName}${turn===meId?" (你)":""} — 猜下一張更高或更低？`}
      </Banner>
      <div className="mx-auto w-40 h-56 rounded-2xl border-brutal shadow-brutal bg-card flex items-center justify-center text-7xl font-black">{face(card)}</div>
      {!loserId && turn === meId && (
        <div className="flex gap-3 justify-center">
          <button onClick={() => guess("hi")} className="border-brutal shadow-brutal-sm rounded-xl px-5 py-2 bg-primary text-primary-foreground font-bold">⬆ 更高</button>
          <button onClick={() => guess("lo")} className="border-brutal shadow-brutal-sm rounded-xl px-5 py-2 bg-secondary font-bold">⬇ 更低</button>
        </div>
      )}
      {loserId && <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">再來一局</button>}
    </div>
  );
}

/* ───────────────────── 15. Dots & Boxes (4x4 dots → 9 boxes) ───────────────────── */
function DotsBoxes({ room, meId, update }: GameProps) {
  const SIZE = 4; // dots per side
  const HCount = SIZE * (SIZE - 1);
  const VCount = (SIZE - 1) * SIZE;
  const p1 = room.players[0]; const p2 = room.players[1];
  if (!p1 || !p2) return <WaitingForPlayers needed={2} />;
  const s = room.state as { h?: (string|null)[]; v?: (string|null)[]; boxes?: (string|null)[]; turn?: string };
  const h = s.h ?? Array(HCount).fill(null);
  const v = s.v ?? Array(VCount).fill(null);
  const boxes = s.boxes ?? Array((SIZE-1)*(SIZE-1)).fill(null);
  const turn = s.turn ?? p1.client_id;
  const myMark = meId === p1.client_id ? "A" : meId === p2.client_id ? "B" : null;

  function checkBoxes(nh: (string|null)[], nv: (string|null)[], nb: (string|null)[], mark: string) {
    let gained = 0;
    const out = [...nb];
    for (let r = 0; r < SIZE-1; r++) for (let c = 0; c < SIZE-1; c++) {
      const i = r*(SIZE-1)+c;
      if (out[i]) continue;
      const top = nh[r*(SIZE-1)+c], bot = nh[(r+1)*(SIZE-1)+c];
      const lft = nv[r*SIZE+c], rgt = nv[r*SIZE+c+1];
      if (top && bot && lft && rgt) { out[i] = mark; gained++; }
    }
    return { boxes: out, gained };
  }

  async function drawH(r: number, c: number) {
    if (turn !== meId || !myMark) return;
    const idx = r*(SIZE-1)+c; if (h[idx]) return;
    const nh = [...h]; nh[idx] = myMark;
    const { boxes: nb, gained } = checkBoxes(nh, v, boxes, myMark);
    const done = nb.every(Boolean);
    const nextTurn = gained > 0 && !done ? meId : (turn === p1.client_id ? p2.client_id : p1.client_id);
    let players = room.players;
    if (done) {
      const a = nb.filter(x=>x==="A").length, b = nb.filter(x=>x==="B").length;
      if (a !== b) players = addScore(room.players, a>b?p1.client_id:p2.client_id, 1);
    }
    await update({ state: { h: nh, v, boxes: nb, turn: nextTurn }, ...(done?{players}:{}) });
  }
  async function drawV(r: number, c: number) {
    if (turn !== meId || !myMark) return;
    const idx = r*SIZE+c; if (v[idx]) return;
    const nv = [...v]; nv[idx] = myMark;
    const { boxes: nb, gained } = checkBoxes(h, nv, boxes, myMark);
    const done = nb.every(Boolean);
    const nextTurn = gained > 0 && !done ? meId : (turn === p1.client_id ? p2.client_id : p1.client_id);
    let players = room.players;
    if (done) {
      const a = nb.filter(x=>x==="A").length, b = nb.filter(x=>x==="B").length;
      if (a !== b) players = addScore(room.players, a>b?p1.client_id:p2.client_id, 1);
    }
    await update({ state: { h, v: nv, boxes: nb, turn: nextTurn }, ...(done?{players}:{}) });
  }
  async function reset() { await update({ state: { h: Array(HCount).fill(null), v: Array(VCount).fill(null), boxes: Array((SIZE-1)*(SIZE-1)).fill(null), turn: p1.client_id } }); }

  const done = boxes.every(Boolean);
  const a = boxes.filter(x=>x==="A").length, b = boxes.filter(x=>x==="B").length;
  const cell = 56;
  return (
    <div className="space-y-3">
      <Banner tone={done ? "win" : "info"}>
        {done ? (a===b ? "平手" : `${a>b?p1.name:p2.name} 獲勝！`) : turn===meId ? `輪到你 (${myMark})` : "等待對手…"}　🟦{a} 🟥{b}
      </Banner>
      <div className="mx-auto bg-card border-brutal shadow-brutal rounded-xl p-3 inline-block">
        <div className="relative" style={{ width: cell*(SIZE-1)+12, height: cell*(SIZE-1)+12 }}>
          {Array.from({length: SIZE}).map((_,r)=>Array.from({length: SIZE}).map((_,c)=>(
            <div key={`d${r}${c}`} className="absolute w-3 h-3 rounded-full bg-foreground" style={{ left: c*cell, top: r*cell }} />
          )))}
          {Array.from({length: SIZE}).map((_,r)=>Array.from({length: SIZE-1}).map((_,c)=>{
            const idx = r*(SIZE-1)+c; const filled = h[idx];
            return <button key={`h${r}${c}`} onClick={()=>drawH(r,c)} disabled={!!filled} className={`absolute h-2 ${filled?"bg-primary":"bg-muted hover:bg-primary/40"}`} style={{ left: c*cell+12, top: r*cell+5, width: cell-12 }} />;
          }))}
          {Array.from({length: SIZE-1}).map((_,r)=>Array.from({length: SIZE}).map((_,c)=>{
            const idx = r*SIZE+c; const filled = v[idx];
            return <button key={`v${r}${c}`} onClick={()=>drawV(r,c)} disabled={!!filled} className={`absolute w-2 ${filled?"bg-primary":"bg-muted hover:bg-primary/40"}`} style={{ left: c*cell+5, top: r*cell+12, height: cell-12 }} />;
          }))}
          {boxes.map((bx,i)=>{
            const r = Math.floor(i/(SIZE-1)), c = i%(SIZE-1);
            if (!bx) return null;
            return <div key={`b${i}`} className={`absolute flex items-center justify-center text-xl font-black ${bx==="A"?"text-blue-500":"text-red-500"}`} style={{ left: c*cell+12, top: r*cell+12, width: cell-12, height: cell-12 }}>{bx}</div>;
          })}
        </div>
      </div>
      {done && <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">再來一局</button>}
    </div>
  );
}

/* ───────────────────── 16. Treasure Hunt (尋寶對戰) ───────────────────── */
function Treasure({ room, meId, update }: GameProps) {
  const N = 5;
  const p1 = room.players[0]; const p2 = room.players[1];
  if (!p1 || !p2) return <WaitingForPlayers needed={2} />;
  const s = room.state as { hidden?: Record<string, number>; shots?: Record<string, number[]>; turn?: string; winnerId?: string | null };
  const hidden = s.hidden ?? {};
  const shots = s.shots ?? { [p1.client_id]: [], [p2.client_id]: [] };
  const turn = s.turn ?? p1.client_id;
  const winnerId = s.winnerId ?? null;
  const myHidden = hidden[meId];
  const oppId = meId === p1.client_id ? p2.client_id : p1.client_id;

  async function hide(i: number) {
    if (myHidden !== undefined) return;
    await update({ state: { ...s, hidden: { ...hidden, [meId]: i }, shots, turn: p1.client_id, winnerId: null } });
  }
  async function shoot(i: number) {
    if (winnerId || turn !== meId || (shots[meId] ?? []).includes(i) || hidden[oppId] === undefined) return;
    const mine = [...(shots[meId] ?? []), i];
    const newShots = { ...shots, [meId]: mine };
    if (i === hidden[oppId]) {
      await update({ state: { ...s, shots: newShots, winnerId: meId }, players: addScore(room.players, meId, 1) });
    } else {
      await update({ state: { ...s, shots: newShots, turn: oppId, winnerId: null } });
    }
  }
  async function reset() { await update({ state: { hidden: {}, shots: { [p1.client_id]: [], [p2.client_id]: [] }, turn: p1.client_id, winnerId: null } }); }

  const bothHidden = hidden[p1.client_id] !== undefined && hidden[p2.client_id] !== undefined;

  return (
    <div className="space-y-3">
      <Banner tone={winnerId ? "win" : "info"}>
        {winnerId ? `💎 ${room.players.find(p=>p.client_id===winnerId)?.name} 找到寶藏！` : !bothHidden ? (myHidden===undefined ? "選一格藏寶藏 💎" : "等對手藏寶藏…") : turn === meId ? "輪到你開砲 💣" : "等待對手…"}
      </Banner>
      <div className="grid grid-cols-5 gap-2 max-w-sm mx-auto">
        {Array.from({ length: N*N }).map((_, i) => {
          const myShot = (shots[meId] ?? []).includes(i);
          const hit = myShot && i === hidden[oppId];
          const isMine = myHidden === i;
          return (
            <button key={i} onClick={() => bothHidden ? shoot(i) : hide(i)} disabled={bothHidden ? (myShot || !!winnerId || turn!==meId) : myHidden!==undefined} className={`aspect-square rounded-lg border-brutal shadow-brutal-sm text-2xl ${hit?"bg-accent":myShot?"bg-muted":"bg-card hover:translate-y-0.5 hover:shadow-none"} transition`}>
              {hit ? "💎" : myShot ? "💥" : isMine && !bothHidden ? "💎" : ""}
            </button>
          );
        })}
      </div>
      {winnerId && <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">再來一局</button>}
    </div>
  );
}

/* ───────────────────── 17. MathRace (心算王) ───────────────────── */
function MathRace({ room, meId, update }: GameProps) {
  const s = room.state as { a?: number; b?: number; op?: "+"|"-"|"×"; winnerId?: string | null; round?: number };
  if (room.players.length < 2) return <WaitingForPlayers needed={2} />;
  const a = s.a ?? 0; const b = s.b ?? 0; const op = s.op ?? "+";
  const winnerId = s.winnerId ?? null;
  const round = s.round ?? 0;
  const [val, setVal] = useState("");
  useEffect(() => { setVal(""); }, [round]);

  function answer() {
    return op === "+" ? a + b : op === "-" ? a - b : a * b;
  }
  async function newQ() {
    const ops: ("+"|"-"|"×")[] = ["+","-","×"];
    const o = ops[Math.floor(Math.random()*ops.length)];
    const x = Math.floor(Math.random()*20)+1, y = Math.floor(Math.random()*20)+1;
    await update({ state: { a: o==="-"?Math.max(x,y):x, b: o==="-"?Math.min(x,y):y, op: o, winnerId: null, round: round + 1 } });
  }
  async function submit() {
    if (winnerId) return;
    const n = parseInt(val);
    if (n === answer()) await update({ state: { ...s, winnerId: meId }, players: addScore(room.players, meId, 1) });
    else setVal("");
  }

  return (
    <div className="space-y-3">
      <Banner tone={winnerId ? "win" : "info"}>
        {winnerId ? `🏆 ${room.players.find(p=>p.client_id===winnerId)?.name} 答對！答案 = ${answer()}` : round === 0 ? "按下一題開始" : "最快答對得分！"}
      </Banner>
      {round > 0 && (
        <div className="mx-auto w-fit border-brutal shadow-brutal rounded-2xl bg-card px-10 py-6 text-5xl font-black">{a} {op} {b} = ?</div>
      )}
      {round > 0 && !winnerId && (
        <div className="flex gap-2 max-w-sm mx-auto">
          <input type="number" value={val} onChange={(e)=>setVal(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&submit()} className="flex-1 border-2 border-foreground/40 rounded-lg px-3 py-2 focus:outline-none focus:border-foreground" />
          <button onClick={submit} className="border-brutal shadow-brutal-sm rounded-lg px-4 bg-primary text-primary-foreground font-bold">送出</button>
        </div>
      )}
      <button onClick={newQ} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-accent font-bold">下一題</button>
    </div>
  );
}

/* ───────────────────── 18. Typing Race (打字賽) ───────────────────── */
function Typing({ room, meId, update }: GameProps) {
  const PHRASES = [
    "the quick brown fox jumps over the lazy dog",
    "lovable cloud realtime games are fun",
    "speed and accuracy win the race today",
    "practice makes perfect typing every day",
    "may the fastest fingers claim victory",
  ];
  const s = room.state as { phrase?: string; winnerId?: string | null; progress?: Record<string, number>; round?: number };
  if (room.players.length < 2) return <WaitingForPlayers needed={2} />;
  const phrase = s.phrase ?? "";
  const progress = s.progress ?? {};
  const winnerId = s.winnerId ?? null;
  const round = s.round ?? 0;
  const [val, setVal] = useState("");
  useEffect(() => { setVal(""); }, [round]);

  async function start() {
    const p = PHRASES[Math.floor(Math.random()*PHRASES.length)];
    await update({ state: { phrase: p, winnerId: null, progress: {}, round: round + 1 } });
  }
  async function onChange(v: string) {
    setVal(v);
    if (winnerId || !phrase) return;
    if (!phrase.startsWith(v)) return; // ignore typos
    const pr = { ...progress, [meId]: v.length };
    if (v === phrase) {
      await update({ state: { ...s, progress: pr, winnerId: meId }, players: addScore(room.players, meId, 1) });
    } else {
      await update({ state: { ...s, progress: pr } });
    }
  }

  return (
    <div className="space-y-3">
      <Banner tone={winnerId ? "win" : "info"}>
        {winnerId ? `⌨️ ${room.players.find(p=>p.client_id===winnerId)?.name} 最快打完！` : phrase ? "把句子完整輸入，輸錯字會擋住！" : "按開始抽題"}
      </Banner>
      {phrase && (
        <div className="mx-auto max-w-xl border-brutal shadow-brutal-sm rounded-xl bg-card p-4 text-lg font-mono break-words">
          <span className="text-muted-foreground">{phrase}</span>
        </div>
      )}
      {phrase && !winnerId && (
        <input value={val} onChange={(e)=>onChange(e.target.value)} className="block w-full max-w-xl mx-auto border-2 border-foreground/40 rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-foreground" placeholder="開始輸入…" />
      )}
      {phrase && (
        <div className="max-w-xl mx-auto space-y-1">
          {room.players.map(p => (
            <div key={p.client_id} className="flex items-center gap-2 text-sm">
              <span className="w-24 truncate">{p.avatar} {p.name}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, ((progress[p.client_id] ?? 0) / phrase.length) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <button onClick={start} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">{phrase ? "換一題" : "開始"}</button>
    </div>
  );
}

/* ───────────────────── 19. Bingo ───────────────────── */
function Bingo({ room, meId, update }: GameProps) {
  function genCard(): number[] {
    const all = Array.from({length: 75}, (_,i)=>i+1);
    for (let i = all.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [all[i],all[j]]=[all[j],all[i]]; }
    const c = all.slice(0, 25); c[12] = 0; return c; // center free
  }
  const s = room.state as { cards?: Record<string, number[]>; drawn?: number[]; winnerId?: string | null };
  if (room.players.length < 2) return <WaitingForPlayers needed={2} />;
  const cards = s.cards ?? {};
  const drawn = s.drawn ?? [];
  const winnerId = s.winnerId ?? null;

  useEffect(() => {
    if (meId === room.host_client_id) {
      const need = room.players.filter(p => !cards[p.client_id]);
      if (need.length) {
        const nc = { ...cards };
        need.forEach(p => { nc[p.client_id] = genCard(); });
        update({ state: { ...s, cards: nc, drawn, winnerId: null } });
      }
    }
  }, [room.players.length, cards]);

  const myCard = cards[meId] ?? [];

  function hasBingo(card: number[], drawn: number[]) {
    const m = card.map(n => n === 0 || drawn.includes(n));
    const lines: number[][] = [];
    for (let r=0;r<5;r++) lines.push([0,1,2,3,4].map(c=>r*5+c));
    for (let c=0;c<5;c++) lines.push([0,1,2,3,4].map(r=>r*5+c));
    lines.push([0,6,12,18,24]); lines.push([4,8,12,16,20]);
    return lines.some(l => l.every(i => m[i]));
  }

  async function draw() {
    if (winnerId) return;
    const remaining = Array.from({length:75}, (_,i)=>i+1).filter(n => !drawn.includes(n));
    if (!remaining.length) return;
    const n = remaining[Math.floor(Math.random()*remaining.length)];
    const nd = [...drawn, n];
    let winner: string | null = null;
    for (const p of room.players) if (hasBingo(cards[p.client_id] ?? [], nd)) { winner = p.client_id; break; }
    const players = winner ? addScore(room.players, winner, 1) : room.players;
    await update({ state: { ...s, drawn: nd, winnerId: winner }, ...(winner?{players}:{}) });
  }
  async function reset() {
    const nc: Record<string, number[]> = {}; room.players.forEach(p => nc[p.client_id] = genCard());
    await update({ state: { cards: nc, drawn: [], winnerId: null } });
  }

  return (
    <div className="space-y-3">
      <Banner tone={winnerId ? "win" : "info"}>
        {winnerId ? `🎉 BINGO! ${room.players.find(p=>p.client_id===winnerId)?.name}` : `已開出 ${drawn.length} 顆　最新：${drawn[drawn.length-1] ?? "—"}`}
      </Banner>
      <div className="grid grid-cols-5 gap-1.5 max-w-xs mx-auto">
        {myCard.map((n, i) => {
          const hit = n === 0 || drawn.includes(n);
          return <div key={i} className={`aspect-square rounded-lg border-brutal shadow-brutal-sm flex items-center justify-center font-black ${hit?"bg-accent":"bg-card"}`}>{n === 0 ? "★" : n}</div>;
        })}
      </div>
      <div className="flex gap-2 justify-center">
        <button onClick={draw} disabled={!!winnerId} className="border-brutal shadow-brutal-sm rounded-xl px-5 py-2 bg-primary text-primary-foreground font-bold disabled:opacity-40">🎱 開球</button>
        <button onClick={reset} className="border-brutal shadow-brutal-sm rounded-xl px-4 py-2 bg-secondary font-bold">重發</button>
      </div>
    </div>
  );
}

/* ───────────────────── 20. Hangman (吊死鬼) ───────────────────── */
function Hangman({ room, meId, update }: GameProps) {
  const WORDS = ["LOVABLE","REALTIME","TYPESCRIPT","CHALLENGE","KEYBOARD","SUPABASE","GAMEROOM","VICTORY","STRATEGY","COMPILER"];
  const s = room.state as { word?: string; guessed?: string[]; wrongs?: number; winnerId?: string | null };
  if (room.players.length < 2) return <WaitingForPlayers needed={2} />;
  const word = s.word ?? "";
  const guessed = s.guessed ?? [];
  const wrongs = s.wrongs ?? 0;
  const winnerId = s.winnerId ?? null;
  const MAX = 6;

  useEffect(() => {
    if (!word && meId === room.host_client_id) {
      update({ state: { word: WORDS[Math.floor(Math.random()*WORDS.length)], guessed: [], wrongs: 0, winnerId: null } });
    }
  }, [word]);

  const won = word && word.split("").every(c => guessed.includes(c));
  const lost = wrongs >= MAX;

  async function pick(ch: string) {
    if (winnerId || won || lost || guessed.includes(ch)) return;
    const ng = [...guessed, ch];
    const wrong = !word.includes(ch);
    const nw = wrong ? wrongs + 1 : wrongs;
    const justWon = word.split("").every(c => ng.includes(c));
    if (justWon) {
      await update({ state: { ...s, guessed: ng, wrongs: nw, winnerId: meId }, players: addScore(room.players, meId, 1) });
    } else {
      await update({ state: { ...s, guessed: ng, wrongs: nw } });
    }
  }
  async function reset() {
    await update({ state: { word: WORDS[Math.floor(Math.random()*WORDS.length)], guessed: [], wrongs: 0, winnerId: null } });
  }

  const display = word.split("").map(c => guessed.includes(c) ? c : "_").join(" ");
  const parts = ["😀","😐","😟","😨","😱","💀","☠️"];

  return (
    <div className="space-y-3">
      <Banner tone={won ? "win" : lost ? "lose" : "info"}>
        {won ? `🎉 解開了！答案：${word}` : lost ? `💀 失敗，答案是：${word}` : `錯誤 ${wrongs} / ${MAX}`}
      </Banner>
      <div className="mx-auto w-fit text-7xl">{parts[Math.min(wrongs, parts.length-1)]}</div>
      <div className="text-center text-3xl font-mono font-black tracking-widest">{display || "—"}</div>
      <div className="grid grid-cols-9 gap-1.5 max-w-lg mx-auto">
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(c => {
          const used = guessed.includes(c);
          const ok = used && word.includes(c);
          return <button key={c} onClick={()=>pick(c)} disabled={used || won || lost || !!winnerId} className={`aspect-square text-sm font-black rounded-md border-brutal shadow-brutal-sm ${used?(ok?"bg-accent":"bg-destructive/40"):"bg-card hover:translate-y-0.5 hover:shadow-none"} transition disabled:cursor-not-allowed`}>{c}</button>;
        })}
      </div>
      {(won || lost) && <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">再來一局</button>}
    </div>
  );
}

/* ───────────────────── 21. SpeedSum (心算閃電戰) ───────────────────── */
function SpeedSum({ room, meId, update }: GameProps) {
  const s = room.state as { a?: number; b?: number; op?: "+"|"-"|"×"; round?: number; max?: number; lastWinner?: string | null };
  if (room.players.length < 2) return <WaitingForPlayers needed={2} />;
  const round = s.round ?? 0;
  const max = s.max ?? 10;
  const [guess, setGuess] = useState("");

  function gen() {
    const ops: ("+"|"-"|"×")[] = ["+", "-", "×"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    const a = op === "×" ? 2 + Math.floor(Math.random()*11) : 10 + Math.floor(Math.random()*89);
    const b = op === "×" ? 2 + Math.floor(Math.random()*11) : 1 + Math.floor(Math.random()*Math.max(2, a-1));
    return { a, b, op };
  }

  useEffect(() => {
    if (s.a == null && meId === room.host_client_id) {
      update({ state: { ...gen(), round: 1, max, lastWinner: null } });
    }
  }, [s.a]);

  const answer = s.op === "+" ? (s.a! + s.b!) : s.op === "-" ? (s.a! - s.b!) : (s.a! * s.b!);
  const done = round >= max && s.lastWinner !== undefined && round > max - 1 && s.a == null;

  async function submit() {
    if (!guess || s.a == null) return;
    const n = parseInt(guess, 10);
    setGuess("");
    if (n === answer) {
      const newRound = round + 1;
      const players = addScore(room.players, meId, 1);
      if (newRound > max) {
        await update({ state: { round: newRound, max, lastWinner: meId, a: undefined, b: undefined, op: undefined }, players });
      } else {
        await update({ state: { ...gen(), round: newRound, max, lastWinner: meId }, players });
      }
    } else {
      sfx.lose();
    }
  }

  async function reset() {
    await update({ state: { ...gen(), round: 1, max, lastWinner: null } });
  }

  if (s.a == null && round > 0) {
    const winner = room.players.slice().sort((a,b)=>b.score-a.score)[0];
    return (
      <div className="space-y-3">
        <Banner tone="win">🏆 結束！{winner.name} 領先（{winner.score}）</Banner>
        <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">再來一局</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Banner tone="info">第 {round} / {max} 題　{s.lastWinner ? `${room.players.find(p=>p.client_id===s.lastWinner)?.name} 上題 +1` : "搶答！"}</Banner>
      <div className="text-center text-6xl font-display font-black my-6">
        {s.a} {s.op} {s.b} = ?
      </div>
      <div className="flex gap-2 justify-center max-w-xs mx-auto">
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value.replace(/[^\-0-9]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          inputMode="numeric"
          className="border-brutal shadow-brutal-sm rounded-xl px-3 py-2 text-center text-2xl font-mono font-black flex-1 bg-card"
          placeholder="?"
          autoFocus
        />
        <button onClick={submit} className="border-brutal shadow-brutal-sm rounded-xl px-5 py-2 bg-primary text-primary-foreground font-bold">送出</button>
      </div>
    </div>
  );
}

/* ───────────────────── 22. DicePoker (骰子撲克) ───────────────────── */
function DicePoker({ room, meId, update }: GameProps) {
  type Roll = { dice: number[]; rerolls: number; done: boolean };
  const s = room.state as { rolls?: Record<string, Roll>; round?: number; max?: number; finishedAt?: number | null };
  if (room.players.length < 2) return <WaitingForPlayers needed={2} />;
  const rolls = s.rolls ?? {};
  const round = s.round ?? 1;
  const max = s.max ?? 3;
  const mine: Roll = rolls[meId] ?? { dice: [0,0,0,0,0], rerolls: 2, done: false };
  const [keep, setKeep] = useState<boolean[]>([false,false,false,false,false]);

  function rollDice() {
    return Array.from({ length: 5 }, () => 1 + Math.floor(Math.random()*6));
  }
  function scoreHand(d: number[]) {
    const counts: Record<number, number> = {};
    d.forEach(n => counts[n] = (counts[n]||0)+1);
    const vals = Object.values(counts).sort((a,b)=>b-a);
    const sum = d.reduce((a,b)=>a+b,0);
    if (vals[0] === 5) return 100 + sum; // five of a kind
    if (vals[0] === 4) return 80 + sum;
    if (vals[0] === 3 && vals[1] === 2) return 70 + sum;
    const sorted = [...new Set(d)].sort((a,b)=>a-b);
    const straight = sorted.length === 5 && (sorted[4]-sorted[0] === 4);
    if (straight) return 60 + sum;
    if (vals[0] === 3) return 40 + sum;
    if (vals[0] === 2 && vals[1] === 2) return 30 + sum;
    if (vals[0] === 2) return 15 + sum;
    return sum;
  }

  async function roll() {
    if (mine.done) return;
    let dice: number[];
    let rerolls = mine.rerolls;
    if (mine.dice.every(d => d === 0)) {
      dice = rollDice();
    } else {
      if (rerolls <= 0) return;
      dice = mine.dice.map((d, i) => keep[i] ? d : 1 + Math.floor(Math.random()*6));
      rerolls -= 1;
    }
    const done = rerolls <= 0;
    sfx.pop();
    await update({ state: { ...s, rolls: { ...rolls, [meId]: { dice, rerolls, done } } } });
    setKeep([false,false,false,false,false]);
  }

  async function stand() {
    if (mine.dice.every(d=>d===0)) return;
    await update({ state: { ...s, rolls: { ...rolls, [meId]: { ...mine, done: true } } } });
  }

  const allDone = room.players.every(p => rolls[p.client_id]?.done);
  useEffect(() => {
    if (allDone && meId === room.host_client_id && s.finishedAt !== round) {
      const scored = room.players.map(p => ({ id: p.client_id, sc: scoreHand(rolls[p.client_id].dice) }));
      const best = Math.max(...scored.map(x => x.sc));
      const winners = scored.filter(x => x.sc === best).map(x => x.id);
      let players = room.players;
      winners.forEach(id => { players = addScore(players, id, 1); });
      sfx.win();
      update({ state: { ...s, finishedAt: round }, players });
    }
  }, [allDone, round]);

  async function nextRound() {
    const nr = round + 1;
    if (nr > max) {
      await update({ state: { rolls: {}, round: 1, max, finishedAt: null } });
    } else {
      await update({ state: { rolls: {}, round: nr, max, finishedAt: null } });
    }
  }

  const FACES = ["⚀","⚁","⚂","⚃","⚄","⚅"];
  return (
    <div className="space-y-3">
      <Banner tone={allDone ? "win" : "info"}>
        第 {round} / {max} 回合　{allDone ? `本回合最佳：${room.players.slice().sort((a,b)=>scoreHand(rolls[b.client_id].dice)-scoreHand(rolls[a.client_id].dice))[0].name}` : "擲骰、保留、再擲（最多 2 次）"}
      </Banner>
      <div className="grid sm:grid-cols-2 gap-3">
        {room.players.map(p => {
          const r = rolls[p.client_id];
          const me = p.client_id === meId;
          return (
            <div key={p.client_id} className={`border-brutal shadow-brutal-sm rounded-2xl p-3 bg-card ${me?"ring-4 ring-primary/40":""}`}>
              <div className="flex items-center justify-between text-xs mb-2"><span className="font-bold">{p.avatar} {p.name}{me?" (你)":""}</span><span className="text-muted-foreground">{r?.done ? `分 ${scoreHand(r.dice)}` : r ? `剩 ${r.rerolls} 次` : "未擲"}</span></div>
              <div className="flex gap-1 justify-center text-5xl">
                {(r?.dice ?? [0,0,0,0,0]).map((d, i) => (
                  me && !r?.done && d !== 0 ? (
                    <button key={i} onClick={() => setKeep(k => k.map((v,j)=>j===i?!v:v))} className={`px-1 rounded ${keep[i]?"bg-accent":""}`}>{FACES[d-1]}</button>
                  ) : (
                    <span key={i} className="opacity-90">{d===0?"❓":FACES[d-1]}</span>
                  )
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!mine.done && (
        <div className="flex gap-2 justify-center">
          <button onClick={roll} disabled={mine.dice[0]!==0 && mine.rerolls<=0} className="border-brutal shadow-brutal-sm rounded-xl px-5 py-2 bg-primary text-primary-foreground font-bold disabled:opacity-40">{mine.dice[0]===0?"🎲 開擲":`🔁 重擲未保留 (${mine.rerolls})`}</button>
          {mine.dice[0]!==0 && <button onClick={stand} className="border-brutal shadow-brutal-sm rounded-xl px-4 py-2 bg-secondary font-bold">不換 / 結算</button>}
        </div>
      )}
      {allDone && <button onClick={nextRound} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">下一回合</button>}
    </div>
  );
}

/* ───────────────────── 23. OddOne (找不同) ───────────────────── */
function OddOne({ room, meId, update }: GameProps) {
  const POOL = ["🍎","🍊","🍇","🍓","🍒","🍉","🍌","🍑","🥝","🥥","🍍","🥭","🍐","🍋","🫐"];
  const s = room.state as { grid?: string[]; oddIdx?: number; round?: number; max?: number; lastWinner?: string | null };
  if (room.players.length < 2) return <WaitingForPlayers needed={2} />;
  const round = s.round ?? 1;
  const max = s.max ?? 10;

  function gen() {
    const base = POOL[Math.floor(Math.random()*POOL.length)];
    let odd = base;
    while (odd === base) odd = POOL[Math.floor(Math.random()*POOL.length)];
    const size = 36;
    const grid = Array(size).fill(base);
    const oddIdx = Math.floor(Math.random()*size);
    grid[oddIdx] = odd;
    return { grid, oddIdx };
  }

  useEffect(() => {
    if (!s.grid && meId === room.host_client_id) {
      update({ state: { ...gen(), round: 1, max, lastWinner: null } });
    }
  }, [s.grid]);

  async function tap(i: number) {
    if (!s.grid) return;
    if (i === s.oddIdx) {
      sfx.score();
      const nr = round + 1;
      const players = addScore(room.players, meId, 1);
      if (nr > max) {
        await update({ state: { grid: undefined, oddIdx: undefined, round: nr, max, lastWinner: meId }, players });
      } else {
        await update({ state: { ...gen(), round: nr, max, lastWinner: meId }, players });
      }
    } else {
      sfx.lose();
      const players = addScore(room.players, meId, -1);
      await update({ state: { ...s }, players });
    }
  }

  async function reset() { await update({ state: { ...gen(), round: 1, max, lastWinner: null } }); }

  if (!s.grid && round > 0) {
    const winner = room.players.slice().sort((a,b)=>b.score-a.score)[0];
    return (
      <div className="space-y-3">
        <Banner tone="win">🏆 {winner.name} 最眼利！（{winner.score}）</Banner>
        <button onClick={reset} className="mx-auto block border-brutal shadow-brutal-sm rounded-xl px-6 py-2 bg-primary text-primary-foreground font-bold">再來一局</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Banner tone="info">第 {round} / {max} 題　{s.lastWinner ? `${room.players.find(p=>p.client_id===s.lastWinner)?.name} 上題搶分` : "找出唯一不同的！點錯 -1"}</Banner>
      <div className="grid grid-cols-6 gap-1 max-w-md mx-auto">
        {(s.grid ?? []).map((c, i) => (
          <button key={i} onClick={() => tap(i)} className="aspect-square text-3xl border-2 border-foreground/10 rounded-lg bg-card hover:bg-secondary/50 hover:scale-105 transition">
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}