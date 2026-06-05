// Tiny Web Audio synth — zero-dep sound effects for games.
// Usage: sfx.click(), sfx.win(), sfx.lose(), sfx.score(), sfx.tick(), sfx.bomb()

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, dur = 0.12, type: OscillatorType = "square", vol = 0.18, when = 0) {
  const ac = getCtx();
  if (!ac || !enabled) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function slide(from: number, to: number, dur = 0.2, type: OscillatorType = "sawtooth", vol = 0.18) {
  const ac = getCtx();
  if (!ac || !enabled) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur = 0.15, vol = 0.2) {
  const ac = getCtx();
  if (!ac || !enabled) return;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(g);
  g.connect(ac.destination);
  src.start();
}

export const sfx = {
  setEnabled(v: boolean) { enabled = v; },
  isEnabled() { return enabled; },
  click: () => tone(720, 0.05, "square", 0.12),
  tap: () => tone(440, 0.06, "triangle", 0.15),
  score: () => { tone(660, 0.08); setTimeout(() => tone(880, 0.12), 70); },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, "triangle", 0.22), i * 90));
  },
  lose: () => slide(440, 110, 0.45, "sawtooth", 0.2),
  tick: () => tone(900, 0.03, "square", 0.1),
  countdown: () => tone(330, 0.12, "sine", 0.2),
  bomb: () => { noise(0.25, 0.25); slide(220, 60, 0.3, "sawtooth", 0.2); },
  pop: () => tone(1200, 0.06, "sine", 0.18),
  zap: () => slide(1200, 200, 0.15, "square", 0.18),
  coin: () => { tone(988, 0.06, "square", 0.18); setTimeout(() => tone(1319, 0.12, "square", 0.18), 60); },
  level: () => [523, 784, 1047, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.14, "square", 0.2), i * 70)),
};

if (typeof window !== "undefined") {
  try {
    const v = localStorage.getItem("sfx_on");
    if (v === "0") enabled = false;
  } catch {}
}

export function toggleSfx() {
  enabled = !enabled;
  try { localStorage.setItem("sfx_on", enabled ? "1" : "0"); } catch {}
  return enabled;
}