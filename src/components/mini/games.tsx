import { useEffect, useMemo, useRef, useState } from "react";
import type { MiniRoom, MiniPlayer } from "@/lib/useMiniRoom";

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

export const GAME_COMPONENTS: Record<string, (p: GameProps) => JSX.Element> = {
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
};