import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const WORLD = 2000;
const FRUIT_COUNT = 90;
const AI_COUNT = 6;

type Point = { x: number; y: number };
type Fruit = Point & { kind: "apple" | "banana" | "strawberry" | "star"; value: number };
type Snake = { id: string; body: Point[]; dir: Point; speed: number; score: number; hue: number; alive: boolean; ai: boolean };

const FRUIT_TYPES: Array<{ kind: Fruit["kind"]; value: number; hue: number }> = [
  { kind: "apple", value: 10, hue: 0 },
  { kind: "banana", value: 20, hue: 52 },
  { kind: "strawberry", value: 30, hue: 330 },
  { kind: "star", value: 50, hue: 45 },
];

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y); }
function makeFruit(): Fruit {
  const t = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
  return { x: rand(30, WORLD - 30), y: rand(30, WORLD - 30), kind: t.kind, value: t.value };
}

function makeSnake(id: string, x: number, y: number, hue: number, ai: boolean): Snake {
  const body = Array.from({ length: 8 }, (_, i) => ({ x: x - i * 16, y }));
  return { id, body, dir: { x: 1, y: 0 }, speed: ai ? 2.5 : 3.8, score: 0, hue, alive: true, ai };
}

export const Route = createFileRoute("/games/snake")({
  component: SnakeGame,
  head: () => ({
    meta: [
      { title: "水果狂歡貪吃蛇｜免費 2D 貪吃蛇遊戲｜畫聊 Doodle" },
      { name: "description", content: "免費 2D 水果貪吃蛇遊戲，吃水果成長、閃避 AI 蛇群，支援鍵盤與觸控操作。" },
      { property: "og:title", content: "水果狂歡貪吃蛇" },
      { property: "og:description", content: "吃水果、變長、挑戰 AI 蛇群的免費 2D 貪吃蛇遊戲。" },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const playerRef = useRef<Snake>(makeSnake("player", WORLD / 2, WORLD / 2, 145, false));
  const snakesRef = useRef<Snake[]>([]);
  const fruitsRef = useRef<Fruit[]>([]);
  const cameraRef = useRef<Point>({ x: WORLD / 2, y: WORLD / 2 });
  const lastTimeRef = useRef(0);
  const runningRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("snake_smooth_highscore") || 0));

  const resetGame = useCallback(() => {
    const player = makeSnake("player", WORLD / 2, WORLD / 2, 145, false);
    playerRef.current = player;
    snakesRef.current = [player, ...Array.from({ length: AI_COUNT }, (_, i) => {
      const a = (i / AI_COUNT) * Math.PI * 2;
      return makeSnake(`ai-${i}`, WORLD / 2 + Math.cos(a) * 500, WORLD / 2 + Math.sin(a) * 500, i * 55 + 10, true);
    })];
    fruitsRef.current = Array.from({ length: FRUIT_COUNT }, makeFruit);
    cameraRef.current = { x: player.body[0].x, y: player.body[0].y };
    setScore(0);
  }, []);

  const start = useCallback(() => {
    resetGame();
    runningRef.current = true;
    setRunning(true);
  }, [resetGame]);

  const gameOver = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    const finalScore = playerRef.current.score;
    if (finalScore > highScore) {
      localStorage.setItem("snake_smooth_highscore", String(finalScore));
      setHighScore(finalScore);
    }
  }, [highScore]);

  useEffect(() => {
    resetGame();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const onKey = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = e.type === "keydown";
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(e.key.toLowerCase())) e.preventDefault();
    };
    window.addEventListener("keydown", onKey, { passive: false });
    window.addEventListener("keyup", onKey, { passive: false });

    const loop = (time: number) => {
      const dt = Math.min(32, time - (lastTimeRef.current || time));
      lastTimeRef.current = time;
      const player = playerRef.current;

      if (runningRef.current) {
        const k = keysRef.current;
        let dir = player.dir;
        if (k.arrowup || k.w) dir = { x: 0, y: -1 };
        if (k.arrowdown || k.s) dir = { x: 0, y: 1 };
        if (k.arrowleft || k.a) dir = { x: -1, y: 0 };
        if (k.arrowright || k.d) dir = { x: 1, y: 0 };
        if (dir.x !== -player.dir.x || dir.y !== -player.dir.y) player.dir = dir;

        for (const snake of snakesRef.current) {
          if (!snake.alive) continue;
          if (snake.ai) {
            let target = fruitsRef.current[0];
            let best = Infinity;
            for (const f of fruitsRef.current) {
              const d = distance(snake.body[0], f);
              if (d < best) { best = d; target = f; }
            }
            if (target) {
              const dx = target.x - snake.body[0].x;
              const dy = target.y - snake.body[0].y;
              if (Math.abs(dx) > Math.abs(dy)) snake.dir = { x: Math.sign(dx) || 1, y: 0 };
              else snake.dir = { x: 0, y: Math.sign(dy) || 1 };
            }
          }
          const head = snake.body[0];
          const speed = snake.speed * (dt / 16.67);
          const next = { x: Math.max(8, Math.min(WORLD - 8, head.x + snake.dir.x * speed * 2.1)), y: Math.max(8, Math.min(WORLD - 8, head.y + snake.dir.y * speed * 2.1)) };
          snake.body.unshift(next);
          snake.body.pop();

          for (let i = fruitsRef.current.length - 1; i >= 0; i--) {
            const f = fruitsRef.current[i];
            if (distance(next, f) < 24) {
              snake.score += f.value;
              const grow = Math.max(1, Math.round(f.value / 10));
              const tail = snake.body[snake.body.length - 1];
              for (let g = 0; g < grow; g++) snake.body.push({ ...tail });
              fruitsRef.current[i] = makeFruit();
              if (snake === player) setScore(snake.score);
            }
          }
        }

        for (const ai of snakesRef.current.filter((s) => s.ai && s.alive)) {
          if (distance(ai.body[0], player.body[0]) < 18 && ai.body.length > player.body.length * 0.85) {
            ai.alive = false;
          }
        }
        for (const ai of snakesRef.current.filter((s) => s.ai && s.alive)) {
          for (let i = 4; i < ai.body.length; i++) {
            if (distance(player.body[0], ai.body[i]) < 13) {
              gameOver();
              break;
            }
          }
        }
        cameraRef.current.x += (player.body[0].x - cameraRef.current.x) * 0.12;
        cameraRef.current.y += (player.body[0].y - cameraRef.current.y) * 0.12;
      }

      const rect = canvas.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#07111f";
      ctx.fillRect(0, 0, w, h);

      const scale = Math.min(w, h) / 900;
      const cam = cameraRef.current;
      ctx.save();
      ctx.translate(w / 2 - cam.x * scale, h / 2 - cam.y * scale);
      ctx.scale(scale, scale);

      ctx.strokeStyle = "rgba(120,180,255,.09)";
      ctx.lineWidth = 1;
      const grid = 50;
      const sx = Math.floor((cam.x - w / scale / 2) / grid) * grid;
      const ex = cam.x + w / scale / 2 + grid;
      const sy = Math.floor((cam.y - h / scale / 2) / grid) * grid;
      const ey = cam.y + h / scale / 2 + grid;
      for (let x = sx; x < ex; x += grid) { ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x, ey); ctx.stroke(); }
      for (let y = sy; y < ey; y += grid) { ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(ex, y); ctx.stroke(); }

      for (const f of fruitsRef.current) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.shadowBlur = 18;
        ctx.shadowColor = f.kind === "star" ? "#ffd54a" : "rgba(255,90,130,.75)";
        ctx.fillStyle = f.kind === "apple" ? "#ff4d6d" : f.kind === "banana" ? "#ffd84d" : f.kind === "strawberry" ? "#ff5c8a" : "#ffe16b";
        if (f.kind === "star") {
          ctx.beginPath();
          for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const r = i % 2 ? 8 : 16; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          ctx.closePath(); ctx.fill();
        } else { ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); }
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      for (const snake of snakesRef.current) {
        if (!snake.alive) continue;
        for (let i = snake.body.length - 1; i >= 0; i--) {
          const p = snake.body[i];
          const t = 1 - i / Math.max(1, snake.body.length);
          ctx.beginPath();
          ctx.fillStyle = `hsl(${snake.hue + t * 40} 85% ${45 + t * 20}%)`;
          ctx.shadowBlur = i === 0 ? 16 : 7;
          ctx.shadowColor = `hsla(${snake.hue} 90% 60% / .55)`;
          ctx.arc(p.x, p.y, i === 0 ? 15 : 12, 0, Math.PI * 2);
          ctx.fill();
        }
        const head = snake.body[0];
        ctx.shadowBlur = 0;
        ctx.fillStyle = "white";
        const side = { x: -snake.dir.y * 5, y: snake.dir.x * 5 };
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(head.x + snake.dir.x * 7 + side.x * s, head.y + snake.dir.y * 7 + side.y * s, 3.2, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = "#111827";
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(head.x + snake.dir.x * 8 + side.x * s, head.y + snake.dir.y * 8 + side.y * s, 1.5, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();

      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [gameOver, resetGame]);

  const setDirection = (x: number, y: number) => {
    const p = playerRef.current;
    if (x === -p.dir.x && y === -p.dir.y) return;
    p.dir = { x, y };
  };

  return (
    <main className="min-h-screen bg-[#050b14] px-3 py-4 text-white sm:px-5">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link to="/games" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-bold hover:bg-white/10"><ArrowLeft className="h-4 w-4" />遊戲大廳</Link>
          <h1 className="text-xl font-black sm:text-2xl">🍎 水果狂歡貪吃蛇</h1>
          <div className="ml-auto flex gap-2 text-sm font-bold"><span className="rounded-xl bg-white/10 px-3 py-2">分數 {score}</span><span className="rounded-xl bg-white/10 px-3 py-2">最高 {highScore}</span></div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
          <canvas ref={canvasRef} className="h-[min(78vh,760px)] w-full touch-none" />
          {!running && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 p-5 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0b1424]/95 p-7 text-center shadow-2xl">
                <div className="mb-3 text-6xl">🐍</div>
                <h2 className="text-3xl font-black">水果狂歡貪吃蛇</h2>
                <p className="mt-3 text-sm leading-6 text-white/65">吃水果讓蛇變長，閃避其他 AI 蛇。人類終於又找到一種方式把吃水果變成競爭，文明真是進步了。</p>
                <button onClick={start} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3 font-black text-black hover:scale-[1.02]"><RotateCcw className="h-4 w-4" />開始遊戲</button>
                <p className="mt-4 text-xs text-white/45">電腦：WASD / 方向鍵　｜　平板：使用下方方向鍵</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-2 sm:hidden">
            <span />
            <button onPointerDown={() => setDirection(0, -1)} className="h-14 w-14 rounded-2xl border border-white/20 bg-black/60 text-2xl">↑</button>
            <span />
            <button onPointerDown={() => setDirection(-1, 0)} className="h-14 w-14 rounded-2xl border border-white/20 bg-black/60 text-2xl">←</button>
            <button onPointerDown={() => setDirection(0, 1)} className="h-14 w-14 rounded-2xl border border-white/20 bg-black/60 text-2xl">↓</button>
            <button onPointerDown={() => setDirection(1, 0)} className="h-14 w-14 rounded-2xl border border-white/20 bg-black/60 text-2xl">→</button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-xs text-white/45">🍎 蘋果</div><b>+10</b></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-xs text-white/45">🍌 香蕉</div><b>+20</b></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-xs text-white/45">🍓 草莓</div><b>+30</b></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="text-xs text-white/45">⭐ 星星</div><b>+50</b></div>
        </div>
      </div>
    </main>
  );
}
