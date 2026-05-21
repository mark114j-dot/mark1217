import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eraser, Trash2 } from "lucide-react";

type Point = { x: number; y: number };
type StrokeData =
  | { type: "stroke"; points: Point[]; color: string; size: number }
  | { type: "clear" };

const COLORS = ["#1a1a1a", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#6366f1", "#a855f7", "#ec4899", "#ffffff"];
const SIZES = [3, 6, 12, 22];

export function DrawingCanvas({
  roomId,
  round,
  canDraw,
}: {
  roomId: string;
  round: number;
  canDraw: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const [color, setColor] = useState("#1a1a1a");
  const [size, setSize] = useState(6);

  // Logical drawing surface
  const W = 900;
  const H = 600;

  function getCtx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function clearCanvas() {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
  }

  function drawStroke(s: Extract<StrokeData, { type: "stroke" }>) {
    const ctx = getCtx();
    if (!ctx || s.points.length === 0) return;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (s.points.length === 1) {
      ctx.beginPath();
      ctx.arc(s.points[0].x, s.points[0].y, s.size / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke();
  }

  // Load existing strokes when round changes
  useEffect(() => {
    clearCanvas();
    let active = true;
    supabase
      .from("strokes")
      .select("data")
      .eq("room_id", roomId)
      .eq("round", round)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!active || !data) return;
        for (const row of data) {
          const d = row.data as StrokeData;
          if (d.type === "clear") clearCanvas();
          else drawStroke(d);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, round]);

  // Subscribe to new strokes
  useEffect(() => {
    const ch = supabase
      .channel(`strokes:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "strokes", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as { data: StrokeData; round: number };
          if (row.round !== round) return;
          if (row.data.type === "clear") clearCanvas();
          else drawStroke(row.data);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId, round]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!canDraw) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    pointsRef.current = [getPos(e)];
    drawStroke({ type: "stroke", points: pointsRef.current, color, size });
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!canDraw || !drawingRef.current) return;
    const p = getPos(e);
    pointsRef.current.push(p);
    // Draw the latest segment locally for immediate feedback
    const ctx = getCtx();
    if (!ctx) return;
    const prev = pointsRef.current[pointsRef.current.length - 2];
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  async function onUp() {
    if (!canDraw || !drawingRef.current) return;
    drawingRef.current = false;
    const stroke: StrokeData = { type: "stroke", points: pointsRef.current, color, size };
    pointsRef.current = [];
    await supabase.from("strokes").insert({ room_id: roomId, round, data: stroke });
  }

  async function handleClear() {
    if (!canDraw) return;
    clearCanvas();
    await supabase.from("strokes").delete().eq("room_id", roomId).eq("round", round);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative border-brutal shadow-brutal rounded-2xl overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className={`block w-full aspect-[3/2] ${canDraw ? "cursor-crosshair" : "cursor-not-allowed"}`}
          style={{ touchAction: "none" }}
        />
        {!canDraw && (
          <div className="absolute top-2 right-2 px-3 py-1 rounded-full bg-foreground/80 text-background text-xs font-semibold">
            👀 觀看中
          </div>
        )}
      </div>

      {canDraw && (
        <div className="flex flex-wrap items-center gap-3 bg-card border-brutal shadow-brutal-sm rounded-2xl p-3">
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ background: c }}
                className={`w-7 h-7 rounded-lg border-2 transition ${color === c ? "border-foreground scale-110" : "border-foreground/30"}`}
                aria-label={`color ${c}`}
              />
            ))}
          </div>
          <div className="flex gap-1.5 items-center">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center transition ${size === s ? "border-foreground bg-secondary" : "border-foreground/30"}`}
              >
                <span className="rounded-full bg-foreground" style={{ width: s, height: s }} />
              </button>
            ))}
          </div>
          <button
            onClick={() => setColor("#ffffff")}
            className="ml-auto w-9 h-9 rounded-lg border-2 border-foreground/30 flex items-center justify-center hover:bg-muted"
            title="橡皮擦"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            className="px-3 h-9 rounded-lg border-2 border-foreground/30 flex items-center gap-1.5 hover:bg-destructive hover:text-destructive-foreground text-sm font-semibold"
          >
            <Trash2 className="w-4 h-4" /> 清除
          </button>
        </div>
      )}
    </div>
  );
}