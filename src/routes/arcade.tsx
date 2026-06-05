import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Coins, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { sfx } from "@/lib/sfx";
import { addCoins, getWallet } from "@/lib/wallet";
import { SfxToggle } from "@/components/SfxToggle";
import { useServerFn } from "@tanstack/react-start";
import { aiPickMove } from "@/lib/aiOpponent.functions";

export const Route = createFileRoute("/arcade")({
  component: Arcade,
  head: () => ({ meta: [{ title: "單人街機 — 10 款 AI 對戰/挑戰遊戲" }] }),
});

type GameDef = { id: string; name: string; emoji: string; desc: string; color: string };

const ARCADE: GameDef[] = [
  { id: "snake", name: "貪食蛇", emoji: "🐍", desc: "吃豆豆變長", color: "#22c55e" },
  { id: "p2048", name: "2048", emoji: "🔢", desc: "合成數字方塊", color: "#f59e0b" },
  { id: "whack", name: "打地鼠", emoji: "🔨", desc: "30 秒內擊中越多越好", color: "#dc2626" },
  { id: "simon", name: "Simon", emoji: "🎵", desc: "記住閃光順序", color: "#8b5cf6" },
  { id: "reaction", name: "反應極限", emoji: "⚡", desc: "看到綠色立刻點", color: "#06b6d4" },
  { id: "math", name: "心算閃電", emoji: "➕", desc: "30 秒內算對越多", color: "#14b8a6" },
  { id: "targets", name: "點靶王", emoji: "🎯", desc: "20 個靶子最快點完", color: "#f43f5e" },
  { id: "balloon", name: "戳氣球", emoji: "🎈", desc: "別讓氣球飛走", color: "#ec4899" },
  { id: "brick", name: "打磚塊", emoji: "🧱", desc: "彈球清磚", color: "#0ea5e9" },
  { id: "ai-ttt", name: "AI 井字棋", emoji: "🤖", desc: "與 Lovable AI 對戰", color: "#6366f1" },
];

function Arcade() {
  const [picked, setPicked] = useState<string | null>(null);
  const [coins, setCoins] = useState(0);

  useEffect(() => { getWallet().then((w) => setCoins(w.coins)); }, []);

  async function reward(amt: number) {
    const n = await addCoins(amt);
    setCoins(n);
    sfx.coin();
    toast.success(`+${amt} 🪙`);
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Link to="/" className="border-brutal shadow-brutal-sm rounded-lg p-2 bg-card hover:translate-y-0.5 hover:shadow-none transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-black">🕹️ 單人街機</h1>
          <div className="ml-auto flex items-center gap-2">
            <SfxToggle />
            <Link to="/shop" className="border-brutal shadow-brutal-sm bg-yellow-100 px-3 py-1.5 rounded-xl font-mono font-bold flex items-center gap-1 hover:translate-y-0.5 hover:shadow-none transition">
              <Coins className="w-4 h-4 text-yellow-600" />{coins}
            </Link>
          </div>
        </div>

        {!picked ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {ARCADE.map((g, i) => (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => { sfx.click(); setPicked(g.id); }}
                className="border-brutal shadow-brutal rounded-2xl p-4 bg-card hover:translate-y-1 hover:shadow-none transition text-left"
                style={{ background: `linear-gradient(135deg, ${g.color}22, transparent)` }}
              >
                <div className="text-4xl mb-2">{g.emoji}</div>
                <div className="font-display font-bold">{g.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{g.desc}</div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div>
            <button onClick={() => { sfx.click(); setPicked(null); }} className="mb-3 border-brutal shadow-brutal-sm rounded-lg px-3 py-1.5 bg-card text-sm font-bold flex items-center gap-1 hover:translate-y-0.5 hover:shadow-none transition">
              <ArrowLeft className="w-3.5 h-3.5" /> 換一款
            </button>
            <GamePicker id={picked} reward={reward} />
          </div>
        )}
      </div>
    </div>
  );
}

function GamePicker({ id, reward }: { id: string; reward: (n: number) => void }) {
  switch (id) {
    case "snake": return <Snake reward={reward} />;
    case "p2048": return <Game2048 reward={reward} />;
    case "whack": return <Whack reward={reward} />;
    case "simon": return <Simon reward={reward} />;
    case "reaction": return <Reaction reward={reward} />;
    case "math": return <MathBlitz reward={reward} />;
    case "targets": return <Targets reward={reward} />;
    case "balloon": return <Balloon reward={reward} />;
    case "brick": return <Brick reward={reward} />;
    case "ai-ttt": return <AITicTacToe reward={reward} />;
    default: return null;
  }
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border-brutal shadow-brutal rounded-2xl p-4 sm:p-6">
      <h2 className="font-display font-bold text-xl mb-3">{title}</h2>
      {children}
    </div>
  );
}

/* ─────── 1. Snake ─────── */
function Snake({ reward }: { reward: (n: number) => void }) {
  const SIZE = 15;
  const [snake, setSnake] = useState<[number, number][]>([[7, 7], [7, 6], [7, 5]]);
  const [dir, setDir] = useState<[number, number]>([0, 1]);
  const [food, setFood] = useState<[number, number]>([5, 10]);
  const [dead, setDead] = useState(false);
  const [score, setScore] = useState(0);
  const dirRef = useRef(dir); dirRef.current = dir;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      const [dy, dx] = dirRef.current;
      if ((k === "ArrowUp" || k === "w") && dy !== 1) setDir([-1, 0]);
      else if ((k === "ArrowDown" || k === "s") && dy !== -1) setDir([1, 0]);
      else if ((k === "ArrowLeft" || k === "a") && dx !== 1) setDir([0, -1]);
      else if ((k === "ArrowRight" || k === "d") && dx !== -1) setDir([0, 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (dead) return;
    const t = setInterval(() => {
      setSnake((s) => {
        const [hy, hx] = s[0];
        const [dy, dx] = dirRef.current;
        const ny = hy + dy, nx = hx + dx;
        if (ny < 0 || ny >= SIZE || nx < 0 || nx >= SIZE || s.some(([y, x]) => y === ny && x === nx)) {
          sfx.lose();
          setDead(true);
          return s;
        }
        const ate = ny === food[0] && nx === food[1];
        const next: [number, number][] = [[ny, nx], ...s];
        if (ate) {
          sfx.score();
          setScore((sc) => sc + 1);
          let f: [number, number];
          do { f = [Math.floor(Math.random() * SIZE), Math.floor(Math.random() * SIZE)]; }
          while (next.some(([y, x]) => y === f[0] && x === f[1]));
          setFood(f);
        } else next.pop();
        return next;
      });
    }, 140);
    return () => clearInterval(t);
  }, [dead, food]);

  useEffect(() => { if (dead) reward(score * 2); }, [dead]);

  function restart() {
    setSnake([[7, 7], [7, 6], [7, 5]]); setDir([0, 1]); setFood([5, 10]); setDead(false); setScore(0);
    sfx.click();
  }

  const cells: string[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill("."));
  snake.forEach(([y, x], i) => (cells[y][x] = i === 0 ? "h" : "s"));
  cells[food[0]][food[1]] = "f";

  return (
    <Shell title="🐍 貪食蛇">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono font-bold">分數：{score}</span>
        {dead && <button onClick={restart} className="ml-auto border-brutal shadow-brutal-sm rounded-lg px-3 py-1 bg-primary text-primary-foreground font-bold flex items-center gap-1"><RotateCcw className="w-3 h-3" /> 重玩</button>}
      </div>
      <div className="grid gap-0.5 mx-auto" style={{ gridTemplateColumns: `repeat(${SIZE},1fr)`, maxWidth: 400 }}>
        {cells.flat().map((c, i) => (
          <div key={i} className={`aspect-square rounded ${c === "h" ? "bg-green-600" : c === "s" ? "bg-green-400" : c === "f" ? "bg-red-500" : "bg-muted"}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 max-w-[180px] mx-auto sm:hidden">
        <div></div>
        <button onTouchStart={() => dirRef.current[0] !== 1 && setDir([-1, 0])} onClick={() => dirRef.current[0] !== 1 && setDir([-1, 0])} className="border-brutal rounded-lg py-2 bg-card font-bold">↑</button>
        <div></div>
        <button onTouchStart={() => dirRef.current[1] !== 1 && setDir([0, -1])} onClick={() => dirRef.current[1] !== 1 && setDir([0, -1])} className="border-brutal rounded-lg py-2 bg-card font-bold">←</button>
        <button onTouchStart={() => dirRef.current[0] !== -1 && setDir([1, 0])} onClick={() => dirRef.current[0] !== -1 && setDir([1, 0])} className="border-brutal rounded-lg py-2 bg-card font-bold">↓</button>
        <button onTouchStart={() => dirRef.current[1] !== -1 && setDir([0, 1])} onClick={() => dirRef.current[1] !== -1 && setDir([0, 1])} className="border-brutal rounded-lg py-2 bg-card font-bold">→</button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">方向鍵 / WASD / 觸控操作</p>
    </Shell>
  );
}

/* ─────── 2. 2048 ─────── */
function Game2048({ reward }: { reward: (n: number) => void }) {
  const [grid, setGrid] = useState<number[][]>(() => seed());
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const rewardedRef = useRef(false);

  function seed() {
    const g = Array.from({ length: 4 }, () => Array(4).fill(0));
    return addRandom(addRandom(g));
  }
  function addRandom(g: number[][]) {
    const empties: [number, number][] = [];
    g.forEach((r, i) => r.forEach((v, j) => v === 0 && empties.push([i, j])));
    if (empties.length === 0) return g;
    const [i, j] = empties[Math.floor(Math.random() * empties.length)];
    const ng = g.map((r) => [...r]);
    ng[i][j] = Math.random() < 0.9 ? 2 : 4;
    return ng;
  }
  function slide(row: number[]) {
    const arr = row.filter((x) => x);
    let gained = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) { arr[i] *= 2; gained += arr[i]; arr.splice(i + 1, 1); }
    }
    while (arr.length < 4) arr.push(0);
    return { row: arr, gained };
  }
  function move(dir: "L" | "R" | "U" | "D") {
    if (done) return;
    let g = grid.map((r) => [...r]);
    let totalGain = 0;
    const transform = (g: number[][]) => g[0].map((_, i) => g.map((r) => r[i]));
    if (dir === "U") g = transform(g);
    if (dir === "D") g = transform(g).map((r) => r.reverse());
    if (dir === "R") g = g.map((r) => r.reverse());
    g = g.map((r) => { const { row, gained } = slide(r); totalGain += gained; return row; });
    if (dir === "R") g = g.map((r) => r.reverse());
    if (dir === "D") g = transform(g.map((r) => r.reverse()));
    if (dir === "U") g = transform(g);
    if (JSON.stringify(g) === JSON.stringify(grid)) return;
    sfx.tap();
    if (totalGain) { sfx.score(); setScore((s) => s + totalGain); }
    const ng = addRandom(g);
    setGrid(ng);
    const flat = ng.flat();
    if (flat.includes(2048) && !rewardedRef.current) { rewardedRef.current = true; reward(500); sfx.win(); }
    if (!flat.includes(0)) {
      const stuck = !["L","R","U","D"].some((d) => {
        let tg = ng.map((r)=>[...r]);
        if (d === "U") tg = transform(tg);
        if (d === "D") tg = transform(tg).map((r)=>r.reverse());
        if (d === "R") tg = tg.map((r)=>r.reverse());
        const moved = tg.map((r) => slide(r).row);
        return JSON.stringify(moved) !== JSON.stringify(tg);
      });
      if (stuck) { setDone(true); sfx.lose(); reward(Math.floor(score / 10)); }
    }
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") move("L");
      else if (e.key === "ArrowRight") move("R");
      else if (e.key === "ArrowUp") move("U");
      else if (e.key === "ArrowDown") move("D");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const COLORS: Record<number, string> = { 0:"bg-muted",2:"bg-amber-100",4:"bg-amber-200",8:"bg-orange-300",16:"bg-orange-400",32:"bg-red-400",64:"bg-red-500 text-white",128:"bg-yellow-400",256:"bg-yellow-500 text-white",512:"bg-green-500 text-white",1024:"bg-blue-500 text-white",2048:"bg-purple-600 text-white" };
  return (
    <Shell title="🔢 2048">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono font-bold">分數：{score}</span>
        {done && <span className="text-red-500 font-bold ml-auto">遊戲結束</span>}
      </div>
      <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
        {grid.flat().map((v, i) => (
          <div key={i} className={`aspect-square rounded-lg flex items-center justify-center font-display font-black text-xl ${COLORS[v] ?? "bg-purple-700 text-white"}`}>
            {v || ""}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 max-w-[200px] mx-auto sm:hidden">
        <div></div>
        <button onClick={() => move("U")} className="border-brutal rounded-lg py-2 bg-card font-bold">↑</button>
        <div></div>
        <button onClick={() => move("L")} className="border-brutal rounded-lg py-2 bg-card font-bold">←</button>
        <button onClick={() => move("D")} className="border-brutal rounded-lg py-2 bg-card font-bold">↓</button>
        <button onClick={() => move("R")} className="border-brutal rounded-lg py-2 bg-card font-bold">→</button>
      </div>
    </Shell>
  );
}

/* ─────── 3. Whack-a-Mole ─────── */
function Whack({ reward }: { reward: (n: number) => void }) {
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  const [mole, setMole] = useState(-1);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTime((x) => x - 1), 1000);
    const m = setInterval(() => setMole(Math.floor(Math.random() * 9)), 700);
    return () => { clearInterval(t); clearInterval(m); };
  }, [running]);
  useEffect(() => {
    if (time <= 0 && running) { setRunning(false); sfx.win(); reward(score * 3); }
  }, [time, running]);
  function start() { setScore(0); setTime(30); setRunning(true); sfx.countdown(); }
  function hit(i: number) {
    if (!running || mole !== i) return;
    sfx.pop();
    setScore((s) => s + 1);
    setMole(-1);
  }
  return (
    <Shell title="🔨 打地鼠">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono font-bold">分數：{score}</span>
        <span className="font-mono">⏱ {time}s</span>
        {!running && <button onClick={start} className="ml-auto border-brutal shadow-brutal-sm rounded-lg px-3 py-1 bg-primary text-primary-foreground font-bold">{time === 30 ? "開始" : "再玩一次"}</button>}
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
        {Array.from({ length: 9 }).map((_, i) => (
          <button key={i} onClick={() => hit(i)} className="aspect-square border-brutal shadow-brutal-sm rounded-2xl bg-amber-100 text-5xl hover:translate-y-0.5 hover:shadow-none transition">
            {mole === i ? "🐹" : "🕳️"}
          </button>
        ))}
      </div>
    </Shell>
  );
}

/* ─────── 4. Simon ─────── */
function Simon({ reward }: { reward: (n: number) => void }) {
  const COLORS = ["#ef4444","#22c55e","#3b82f6","#eab308"];
  const TONES = [262, 330, 392, 523];
  const [seq, setSeq] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [flash, setFlash] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [showing, setShowing] = useState(false);

  async function playSeq(s: number[]) {
    setShowing(true);
    for (let i = 0; i < s.length; i++) {
      await new Promise((r) => setTimeout(r, 350));
      setFlash(s[i]);
      (window as any).__tone = TONES[s[i]];
      sfx.tap();
      const ac = (sfx as any);
      // play exact tone
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const c = new AC();
        const o = c.createOscillator(); const g = c.createGain();
        o.frequency.value = TONES[s[i]]; o.type = "triangle";
        g.gain.value = 0.2; o.connect(g); g.connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.3);
      } catch {}
      await new Promise((r) => setTimeout(r, 350));
      setFlash(-1);
    }
    setShowing(false);
  }

  function start() {
    const s = [Math.floor(Math.random() * 4)];
    setSeq(s); setStep(0); setPlaying(true);
    setTimeout(() => playSeq(s), 400);
  }

  function tap(i: number) {
    if (!playing || showing) return;
    setFlash(i); setTimeout(() => setFlash(-1), 150);
    if (seq[step] !== i) { sfx.lose(); setPlaying(false); reward(seq.length * 5); return; }
    sfx.tap();
    if (step + 1 === seq.length) {
      const next = [...seq, Math.floor(Math.random() * 4)];
      setSeq(next); setStep(0);
      setTimeout(() => playSeq(next), 600);
    } else setStep(step + 1);
  }

  return (
    <Shell title="🎵 Simon Says">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono font-bold">關卡：{seq.length}</span>
        {!playing && <button onClick={start} className="ml-auto border-brutal shadow-brutal-sm rounded-lg px-3 py-1 bg-primary text-primary-foreground font-bold">{seq.length ? "重來" : "開始"}</button>}
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
        {COLORS.map((c, i) => (
          <button key={i} onClick={() => tap(i)} disabled={showing} className="aspect-square rounded-2xl border-brutal shadow-brutal-sm transition" style={{ background: c, opacity: flash === i ? 1 : 0.5 }} />
        ))}
      </div>
    </Shell>
  );
}

/* ─────── 5. Reaction ─────── */
function Reaction({ reward }: { reward: (n: number) => void }) {
  const [state, setState] = useState<"idle"|"wait"|"go"|"done"|"early">("idle");
  const [ms, setMs] = useState(0);
  const t0 = useRef(0);
  const timer = useRef<any>(null);
  function start() {
    setState("wait"); setMs(0);
    timer.current = setTimeout(() => { setState("go"); t0.current = performance.now(); sfx.pop(); }, 1000 + Math.random() * 3000);
  }
  function tap() {
    if (state === "wait") { clearTimeout(timer.current); setState("early"); sfx.lose(); }
    else if (state === "go") {
      const t = Math.round(performance.now() - t0.current);
      setMs(t); setState("done"); sfx.win();
      reward(Math.max(0, 50 - Math.floor(t / 10)));
    } else start();
  }
  const bg = state === "go" ? "bg-green-500" : state === "wait" ? "bg-red-500" : state === "early" ? "bg-orange-500" : "bg-muted";
  return (
    <Shell title="⚡ 反應極限">
      <button onClick={state === "idle" ? start : tap} className={`w-full h-64 rounded-2xl border-brutal shadow-brutal flex items-center justify-center font-display font-black text-2xl text-white ${bg}`}>
        {state === "idle" && "點此開始"}
        {state === "wait" && "等待綠色…"}
        {state === "go" && "立刻點！"}
        {state === "early" && "太早了！再試一次"}
        {state === "done" && `${ms} ms — 再試一次`}
      </button>
    </Shell>
  );
}

/* ─────── 6. Math Blitz ─────── */
function MathBlitz({ reward }: { reward: (n: number) => void }) {
  const [q, setQ] = useState<{ a: number; b: number; op: string; ans: number }>(() => gen());
  const [val, setVal] = useState("");
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  const [running, setRunning] = useState(false);
  function gen() {
    const ops = ["+","-","×"];
    const op = ops[Math.floor(Math.random() * 3)];
    const a = 1 + Math.floor(Math.random() * (op === "×" ? 12 : 50));
    const b = 1 + Math.floor(Math.random() * (op === "×" ? 12 : 50));
    const ans = op === "+" ? a + b : op === "-" ? a - b : a * b;
    return { a, b, op, ans };
  }
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTime((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (time <= 0 && running) { setRunning(false); sfx.win(); reward(score * 4); }
  }, [time, running]);
  function check(v: string) {
    setVal(v);
    if (parseInt(v, 10) === q.ans) { sfx.score(); setScore((s) => s + 1); setQ(gen()); setVal(""); }
  }
  function start() { setScore(0); setTime(30); setRunning(true); setQ(gen()); sfx.countdown(); }
  return (
    <Shell title="➕ 心算閃電">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono font-bold">分數：{score}</span>
        <span className="font-mono">⏱ {time}s</span>
        {!running && <button onClick={start} className="ml-auto border-brutal shadow-brutal-sm rounded-lg px-3 py-1 bg-primary text-primary-foreground font-bold">開始</button>}
      </div>
      {running && (
        <div className="text-center py-6">
          <div className="text-5xl font-display font-black mb-4">{q.a} {q.op} {q.b}</div>
          <input autoFocus inputMode="numeric" value={val} onChange={(e) => check(e.target.value)} className="border-brutal rounded-xl text-3xl text-center font-mono w-40 px-4 py-2" />
        </div>
      )}
    </Shell>
  );
}

/* ─────── 7. Targets ─────── */
function Targets({ reward }: { reward: (n: number) => void }) {
  const [targets, setTargets] = useState<{ id: number; x: number; y: number }[]>([]);
  const [start, setStart] = useState(0);
  const [done, setDone] = useState(0);
  function go() {
    setTargets(Array.from({ length: 20 }, (_, i) => ({ id: i, x: 5 + Math.random() * 85, y: 5 + Math.random() * 85 })));
    setStart(performance.now()); setDone(0);
    sfx.countdown();
  }
  function hit(id: number) {
    sfx.pop();
    const left = targets.filter((t) => t.id !== id);
    setTargets(left);
    if (left.length === 0) {
      const ms = performance.now() - start;
      setDone(Math.round(ms));
      sfx.win();
      reward(Math.max(10, 200 - Math.floor(ms / 100)));
    }
  }
  return (
    <Shell title="🎯 點靶王">
      <div className="flex items-center gap-3 mb-3">
        {done > 0 && <span className="font-mono font-bold text-green-600">{done} ms</span>}
        <button onClick={go} className="ml-auto border-brutal shadow-brutal-sm rounded-lg px-3 py-1 bg-primary text-primary-foreground font-bold">{targets.length ? "重來" : "開始"}</button>
      </div>
      <div className="relative h-80 bg-gradient-to-br from-sky-100 to-pink-100 border-brutal rounded-2xl overflow-hidden">
        {targets.map((t) => (
          <button key={t.id} onClick={() => hit(t.id)} className="absolute w-9 h-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 border-2 border-white shadow-lg hover:scale-110 transition" style={{ left: `${t.x}%`, top: `${t.y}%` }} />
        ))}
      </div>
    </Shell>
  );
}

/* ─────── 8. Balloon Pop ─────── */
function Balloon({ reward }: { reward: (n: number) => void }) {
  type B = { id: number; x: number; y: number; c: string; v: number };
  const [balloons, setBalloons] = useState<B[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [over, setOver] = useState(false);
  const idRef = useRef(0);
  useEffect(() => {
    if (over) return;
    const spawn = setInterval(() => {
      setBalloons((b) => [...b, { id: idRef.current++, x: 5 + Math.random() * 85, y: 100, c: ["#ef4444","#3b82f6","#22c55e","#eab308","#a855f7"][Math.floor(Math.random()*5)], v: 0.5 + Math.random() * 0.8 }]);
    }, 800);
    const tick = setInterval(() => {
      setBalloons((b) => {
        const moved = b.map((x) => ({ ...x, y: x.y - x.v }));
        const escaped = moved.filter((x) => x.y < -10);
        if (escaped.length) { sfx.lose(); setLives((l) => l - escaped.length); }
        return moved.filter((x) => x.y >= -10);
      });
    }, 50);
    return () => { clearInterval(spawn); clearInterval(tick); };
  }, [over]);
  useEffect(() => { if (lives <= 0 && !over) { setOver(true); sfx.lose(); reward(score * 2); } }, [lives, over]);
  function pop(id: number) { setBalloons((b) => b.filter((x) => x.id !== id)); sfx.pop(); setScore((s) => s + 1); }
  function reset() { setBalloons([]); setScore(0); setLives(3); setOver(false); }
  return (
    <Shell title="🎈 戳氣球">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono font-bold">分數：{score}</span>
        <span>{"❤️".repeat(Math.max(0, lives))}</span>
        {over && <button onClick={reset} className="ml-auto border-brutal shadow-brutal-sm rounded-lg px-3 py-1 bg-primary text-primary-foreground font-bold">重玩</button>}
      </div>
      <div className="relative h-96 bg-gradient-to-b from-sky-200 to-sky-50 border-brutal rounded-2xl overflow-hidden">
        {balloons.map((b) => (
          <button key={b.id} onClick={() => pop(b.id)} className="absolute w-10 h-12 rounded-full -translate-x-1/2 transition-none" style={{ left: `${b.x}%`, bottom: `${b.y}%`, background: b.c, boxShadow: "inset -4px -4px 8px rgba(0,0,0,0.2)" }} />
        ))}
      </div>
    </Shell>
  );
}

/* ─────── 9. Brick ─────── */
function Brick({ reward }: { reward: (n: number) => void }) {
  const cvs = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [state, setState] = useState<"idle"|"play"|"win"|"lose">("idle");
  const stateRef = useRef(state); stateRef.current = state;

  useEffect(() => {
    if (state !== "play") return;
    const c = cvs.current!; const ctx = c.getContext("2d")!;
    const W = c.width, H = c.height;
    let bx = W/2, by = H-30, vx = 3, vy = -3;
    let paddleX = W/2 - 40;
    const PW = 80, PH = 10, BR = 7;
    const cols = 8, rows = 4;
    const bricks: { x:number;y:number;a:boolean }[] = [];
    for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) bricks.push({ x: cc*(W/cols), y: 20 + r*20, a: true });
    let sc = 0;
    function onMove(e: MouseEvent | TouchEvent) {
      const rect = c.getBoundingClientRect();
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      paddleX = Math.max(0, Math.min(W - PW, (x - rect.left) * (W/rect.width) - PW/2));
    }
    c.addEventListener("mousemove", onMove);
    c.addEventListener("touchmove", onMove);
    let raf = 0;
    const loop = () => {
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle = "#0ea5e9";
      bricks.forEach((br) => { if (br.a) ctx.fillRect(br.x+2, br.y, W/cols-4, 14); });
      ctx.fillStyle = "#111"; ctx.fillRect(paddleX, H-PH-2, PW, PH);
      ctx.beginPath(); ctx.arc(bx, by, BR, 0, Math.PI*2); ctx.fillStyle = "#dc2626"; ctx.fill();
      bx += vx; by += vy;
      if (bx < BR || bx > W-BR) vx = -vx;
      if (by < BR) vy = -vy;
      if (by > H-PH-BR-2 && bx > paddleX && bx < paddleX+PW) { vy = -Math.abs(vy); sfx.tap(); }
      if (by > H) { sfx.lose(); setState("lose"); reward(sc * 2); cancelAnimationFrame(raf); return; }
      for (const br of bricks) {
        if (!br.a) continue;
        if (bx > br.x && bx < br.x + W/cols && by > br.y && by < br.y + 14) {
          br.a = false; vy = -vy; sc++; setScore(sc); sfx.pop();
        }
      }
      if (bricks.every((b) => !b.a)) { sfx.win(); setState("win"); reward(200 + sc * 2); cancelAnimationFrame(raf); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); c.removeEventListener("mousemove", onMove); c.removeEventListener("touchmove", onMove); };
  }, [state]);

  return (
    <Shell title="🧱 打磚塊">
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono font-bold">分數：{score}</span>
        {state !== "play" && <button onClick={() => { setScore(0); setState("play"); sfx.countdown(); }} className="ml-auto border-brutal shadow-brutal-sm rounded-lg px-3 py-1 bg-primary text-primary-foreground font-bold">{state === "idle" ? "開始" : "再玩"}</button>}
      </div>
      <canvas ref={cvs} width={400} height={300} className="w-full max-w-md mx-auto border-brutal rounded-xl bg-sky-50 block cursor-none" />
      {state === "win" && <p className="text-center mt-3 font-bold text-green-600">🎉 全清！</p>}
      {state === "lose" && <p className="text-center mt-3 font-bold text-red-500">球掉了…</p>}
    </Shell>
  );
}

/* ─────── 10. AI Tic-Tac-Toe ─────── */
function AITicTacToe({ reward }: { reward: (n: number) => void }) {
  const [board, setBoard] = useState<(string|null)[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X"|"O">("X");
  const [winner, setWinner] = useState<string|null>(null);
  const [thinking, setThinking] = useState(false);
  const ai = useServerFn(aiPickMove);

  function check(b: (string|null)[]) {
    const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,c,d] of L) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    if (b.every(Boolean)) return "draw";
    return null;
  }

  const aiMove = useCallback(async (b: (string|null)[]) => {
    setThinking(true);
    const legal = b.map((c, i) => c ? null : String(i)).filter(Boolean) as string[];
    const state = b.map((c, i) => `[${i}:${c ?? "_"}]`).join("");
    try {
      const { move } = await ai({ data: { gameId: "tic-tac-toe", state, legalMoves: legal, persona: "你是井字棋專家，會優先連線、其次封堵對手。" } });
      const idx = parseInt(move, 10);
      if (!isNaN(idx) && !b[idx]) {
        const nb = [...b]; nb[idx] = "O";
        sfx.tap();
        setBoard(nb); setTurn("X");
        const w = check(nb);
        if (w) finish(w);
      }
    } catch {
      const idx = parseInt(legal[Math.floor(Math.random()*legal.length)], 10);
      const nb = [...b]; nb[idx] = "O";
      setBoard(nb); setTurn("X");
      const w = check(nb); if (w) finish(w);
    } finally { setThinking(false); }
  }, [ai]);

  function finish(w: string) {
    setWinner(w);
    if (w === "X") { sfx.win(); reward(30); }
    else if (w === "O") sfx.lose();
    else { sfx.tap(); reward(10); }
  }

  async function play(i: number) {
    if (winner || board[i] || turn !== "X" || thinking) return;
    const nb = [...board]; nb[i] = "X"; sfx.tap();
    setBoard(nb); setTurn("O");
    const w = check(nb);
    if (w) { finish(w); return; }
    setTimeout(() => aiMove(nb), 300);
  }

  function reset() { setBoard(Array(9).fill(null)); setTurn("X"); setWinner(null); sfx.click(); }

  return (
    <Shell title="🤖 AI 井字棋">
      <div className="text-center mb-3 font-bold">
        {winner === "X" && "🎉 你贏了！+30 🪙"}
        {winner === "O" && "😅 AI 贏了"}
        {winner === "draw" && "🤝 平手 +10 🪙"}
        {!winner && (thinking ? "AI 思考中…" : turn === "X" ? "輪到你 (X)" : "AI 回合…")}
      </div>
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {board.map((c, i) => (
          <button key={i} onClick={() => play(i)} className="aspect-square border-brutal shadow-brutal-sm rounded-xl bg-card text-5xl font-black hover:translate-y-0.5 hover:shadow-none transition">
            {c}
          </button>
        ))}
      </div>
      {winner && <button onClick={reset} className="mt-3 mx-auto block border-brutal shadow-brutal-sm rounded-lg px-4 py-2 bg-primary text-primary-foreground font-bold">再來一局</button>}
    </Shell>
  );
}