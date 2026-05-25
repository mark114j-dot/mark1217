import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const KEY = "draw_music_on";

type MusicCtx = {
  enabled: boolean;
  toggle: () => void;
};

const Ctx = createContext<MusicCtx>({ enabled: false, toggle: () => {} });

// Cute pentatonic loop: notes in semitones from A4 (440Hz)
// C major pentatonic: C D E G A => relative to A4 ratios
const NOTES_HZ = {
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
  G4: 392.0,
  C4: 261.63,
  E4: 329.63,
  A4: 440.0,
};

// 16-step happy melody loop
const MELODY: (keyof typeof NOTES_HZ | null)[] = [
  "C5", "E5", "G5", "E5",
  "D5", "G5", "A5", "G5",
  "E5", "C5", "D5", "E5",
  "G5", "E5", "D5", "C5",
];
const BASS: (keyof typeof NOTES_HZ | null)[] = [
  "C4", null, "G4", null,
  "G4", null, "C4", null,
  "A4", null, "E4", null,
  "G4", null, "C4", null,
];

const STEP_MS = 220; // ~ 68 BPM in 8ths

export function MusicProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(0);

  // Load preference on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(KEY);
    if (saved === "1") setEnabled(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEY, enabled ? "1" : "0");

    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      if (gainRef.current && ctxRef.current) {
        gainRef.current.gain.cancelScheduledValues(ctxRef.current.currentTime);
        gainRef.current.gain.setValueAtTime(0, ctxRef.current.currentTime);
      }
      return;
    }

    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AC();
      const master = ctxRef.current.createGain();
      master.gain.value = 0.08;
      master.connect(ctxRef.current.destination);
      gainRef.current = master;
    }
    const audio = ctxRef.current;
    const master = gainRef.current!;
    if (audio.state === "suspended") audio.resume();
    master.gain.setValueAtTime(0.08, audio.currentTime);

    function playNote(name: keyof typeof NOTES_HZ, dur: number, type: OscillatorType, vol: number) {
      const osc = audio.createOscillator();
      const g = audio.createGain();
      osc.type = type;
      osc.frequency.value = NOTES_HZ[name];
      const t = audio.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    timerRef.current = setInterval(() => {
      const i = stepRef.current % MELODY.length;
      const m = MELODY[i];
      const b = BASS[i];
      if (m) playNote(m, 0.25, "triangle", 0.6);
      if (b) playNote(b, 0.4, "sine", 0.5);
      stepRef.current++;
    }, STEP_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled]);

  return <Ctx.Provider value={{ enabled, toggle: () => setEnabled((v) => !v) }}>{children}</Ctx.Provider>;
}

export function useMusic() {
  return useContext(Ctx);
}