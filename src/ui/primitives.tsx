/**
 * Shared UI primitives: SVG icon set, rotary Knob, Meter, MasterMeter, Fader.
 * Mirrors the Terminal DAW reference design.
 */
import { useEffect, useRef, useState } from "react";
import { audioEngine } from "../engine/AudioEngine";

/* ---- note helpers ---- */
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function midiToName(m: number): string { return NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1); }
export function nameToMidi(n: string): number {
  const m = /^([A-G])(#|b)?(-?\d+)$/.exec(n);
  if (!m) return 60;
  let pc = NOTE_NAMES.indexOf(m[1]);
  if (m[2] === "#") pc += 1;
  if (m[2] === "b") pc -= 1;
  return pc + (parseInt(m[3], 10) + 1) * 12;
}
export function transpose(note: string, semitones: number): string {
  const m = Math.max(24, Math.min(96, nameToMidi(note) + semitones));
  return midiToName(m);
}

/* ---- glyph icons ---- */
type IconName =
  | "play" | "stop" | "rec" | "loop" | "metro" | "plus" | "x" | "power"
  | "chevron" | "wave" | "grid" | "sliders" | "cpu" | "trash";

export function Icon({ name, size = 14, className = "" }: { name: IconName; size?: number; className?: string }) {
  const c = "currentColor";
  const wrap = (children: React.ReactNode) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>{children}</svg>
  );
  switch (name) {
    case "play": return <svg width={size} height={size} viewBox="0 0 24 24" className={className}><polygon points="6,4 20,12 6,20" fill={c} /></svg>;
    case "stop": return <svg width={size} height={size} viewBox="0 0 24 24" className={className}><rect x="6" y="6" width="12" height="12" fill={c} /></svg>;
    case "rec": return <svg width={size} height={size} viewBox="0 0 24 24" className={className}><circle cx="12" cy="12" r="6" fill={c} /></svg>;
    case "loop": return wrap(<><path d="M4 9 H16 a4 4 0 0 1 4 4" /><polyline points="13,4 17,8 13,12" transform="translate(-1 1)" /><path d="M20 15 H8 a4 4 0 0 1 -4 -4" /><polyline points="11,20 7,16 11,12" transform="translate(1 -1)" /></>);
    case "metro": return wrap(<><polygon points="9,4 15,4 19,20 5,20" /><line x1="12" y1="16" x2="16" y2="7" /></>);
    case "plus": return wrap(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>);
    case "x": return wrap(<><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>);
    case "power": return wrap(<><line x1="12" y1="3" x2="12" y2="12" /><path d="M7 6 a8 8 0 1 0 10 0" /></>);
    case "chevron": return wrap(<polyline points="8,5 15,12 8,19" />);
    case "wave": return wrap(<polyline points="2,12 5,12 7,5 10,19 13,8 16,16 18,12 22,12" />);
    case "grid": return wrap(<><rect x="4" y="4" width="16" height="16" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="12" y1="4" x2="12" y2="20" /></>);
    case "sliders": return wrap(<><line x1="6" y1="4" x2="6" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /><line x1="18" y1="4" x2="18" y2="20" /><rect x="3" y="8" width="6" height="3" fill={c} /><rect x="9" y="13" width="6" height="3" fill={c} /><rect x="15" y="6" width="6" height="3" fill={c} /></>);
    case "cpu": return wrap(<><rect x="6" y="6" width="12" height="12" /><line x1="9" y1="2" x2="9" y2="6" /><line x1="15" y1="2" x2="15" y2="6" /><line x1="9" y1="18" x2="9" y2="22" /><line x1="15" y1="18" x2="15" y2="22" /><line x1="2" y1="9" x2="6" y2="9" /><line x1="2" y1="15" x2="6" y2="15" /><line x1="18" y1="9" x2="22" y2="9" /><line x1="18" y1="15" x2="22" y2="15" /></>);
    case "trash": return wrap(<><polyline points="4,6 20,6" /><path d="M7 6 V20 H17 V6" /><line x1="10" y1="10" x2="10" y2="16" /><line x1="14" y1="10" x2="14" y2="16" /><path d="M9 6 V3 H15 V6" /></>);
  }
}

/* ---- rotary Knob: vertical drag ---- */
export function Knob({ value, min = 0, max = 1, step = 0.01, size = 38, label, unit = "", color = "var(--grn)", onChange, fmt }: {
  value: number; min?: number; max?: number; step?: number; size?: number;
  label?: string; unit?: string; color?: string;
  onChange: (v: number) => void; fmt?: (v: number) => string;
}) {
  const norm = (value - min) / (max - min);
  const ang = -135 + norm * 270;
  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const startY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const startVal = value;
    const move = (ev: MouseEvent | TouchEvent) => {
      const y = "touches" in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
      const dy = startY - y;
      const fine = (ev as MouseEvent).shiftKey ? 0.25 : 1;
      let v = startVal + (dy / 140) * (max - min) * fine;
      v = Math.round(v / step) * step;
      v = Math.max(min, Math.min(max, v));
      onChange(v);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  };
  const r = size / 2 - 3, cx = size / 2, cy = size / 2;
  const a0 = (-135) * Math.PI / 180, a1 = ang * Math.PI / 180;
  const pt = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  const [sx, sy] = pt(a0), [ex, ey] = pt(a1);
  const large = (ang - (-135)) > 180 ? 1 : 0;
  const display = fmt
    ? fmt(value)
    : (Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2).replace(/\.?0+$/, "")) + unit;
  return (
    <div className="knob" onMouseDown={onDown} onTouchStart={onDown} title={label} style={{ width: size }}>
      <svg width={size} height={size} className="knob-svg">
        <circle cx={cx} cy={cy} r={r} className="knob-track" />
        <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={pt(a1)[0]} y2={pt(a1)[1]} stroke={color} strokeWidth="2" />
      </svg>
      {label && <div className="knob-label">{label}</div>}
      <div className="knob-val" style={{ color }}>{display}</div>
    </div>
  );
}

/* ---- per-track level meter ---- */
export function Meter({ trackId, vertical = false, w, h }: { trackId: string; vertical?: boolean; w?: number | string; h?: number | string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = audioEngine.getTrackLevel(trackId);
      if (ref.current) ref.current.style.setProperty("--lvl", Math.min(1, v).toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [trackId]);
  return <div ref={ref} className={"meter" + (vertical ? " meter-v" : "")} style={{ width: w, height: h }}><div className="meter-fill" /></div>;
}

/* ---- master meter (two-bar stereo-ish) ---- */
export function MasterMeter() {
  const a = useRef<HTMLDivElement>(null), b = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = audioEngine.getMasterLevel();
      const s = Math.min(1, v * 1.8);
      if (a.current) a.current.style.setProperty("--lvl", s.toFixed(3));
      if (b.current) b.current.style.setProperty("--lvl", Math.min(1, s * 0.92).toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="master-meter">
      <div ref={a} className="meter meter-v"><div className="meter-fill" /></div>
      <div ref={b} className="meter meter-v"><div className="meter-fill" /></div>
    </div>
  );
}

/* ---- vertical fader ---- */
export function Fader({ value, onChange, color = "var(--grn)" }: { value: number; onChange: (v: number) => void; color?: string }) {
  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const set = (clientY: number) => {
      let n = 1 - (clientY - rect.top) / rect.height;
      n = Math.max(0, Math.min(1, n));
      onChange(parseFloat(n.toFixed(3)));
    };
    set("touches" in e ? e.touches[0].clientY : e.clientY);
    const move = (ev: MouseEvent | TouchEvent) => set("touches" in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  };
  return (
    <div className="fader" onMouseDown={onDown} onTouchStart={onDown}>
      <div className="fader-track" />
      <div className="fader-fill" style={{ height: (value * 100) + "%", background: color }} />
      <div className="fader-cap" style={{ bottom: `calc(${value * 100}% - 5px)` }} />
    </div>
  );
}

/* ---- live clock for the title bar ---- */
export function useClock(): string {
  const [clock, setClock] = useState(() => new Date().toTimeString().slice(0, 8));
  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toTimeString().slice(0, 8)), 1000);
    return () => clearInterval(id);
  }, []);
  return clock;
}
