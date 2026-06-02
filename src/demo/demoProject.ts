/**
 * Default project loaded on first run: a six-track terminal-DAW beat that
 * exercises drums, melodic synths, and the FX rack. Patterns mirror the
 * Terminal DAW reference design.
 */
import { PROJECT_VERSION, type Project, type Step } from "../model/types";

/** Compact 16-step builder: 'x' = on, '.' = off. Optional note assigns a single-note step. */
function pat(s: string, note?: string, velocity = 0.9): Step[] {
  return s.split("").map((c) =>
    c === "x"
      ? { active: true, notes: note ? [note] : undefined, velocity }
      : { active: false },
  );
}

export function demoProject(): Project {
  return {
    version: PROJECT_VERSION,
    name: "untitled.daw",
    bpm: 120,
    swing: 0.12,
    loop: { bars: 1, stepsPerBar: 16 },
    masterVol: 0.85,
    tracks: [
      {
        id: "t-kick", name: "KICK", color: "var(--grn)",
        module: { type: "kick", params: {} }, effects: [],
        pattern: { steps: pat("x...x...x...x...") },
        vol: 0.92, pan: 0, mute: false, solo: false,
      },
      {
        id: "t-clap", name: "CLAP", color: "var(--amber)",
        module: { type: "clap", params: {} },
        effects: [{ id: "fx-clap-rev", type: "REVERB", params: { size: 2.2, decay: 2.5, mix: 0.3 } }],
        pattern: { steps: pat("....x.......x...") },
        vol: 0.7, pan: 0, mute: false, solo: false,
      },
      {
        id: "t-hat", name: "HAT", color: "var(--cyan)",
        module: { type: "hat", params: {} }, effects: [],
        pattern: { steps: pat("..x...x...x...x.") },
        vol: 0.55, pan: 0, mute: false, solo: false,
      },
      {
        id: "t-bass", name: "BASS", color: "var(--grn)",
        module: { type: "bass", params: {} },
        effects: [{ id: "fx-bass-flt", type: "FILTER", params: { mode: "lowpass", freq: 1200, q: 4 } }],
        pattern: { steps: pat("x..x..x.x..x..x.", "C2") },
        defaultNote: "C2",
        vol: 0.85, pan: 0, mute: false, solo: false,
      },
      {
        id: "t-pluck", name: "PLUCK", color: "var(--amber)",
        module: { type: "pluck", params: {} },
        effects: [{ id: "fx-pluck-dly", type: "DELAY", params: { time: 0.28, feedback: 0.35, mix: 0.3 } }],
        pattern: { steps: pat("x...x.x...x.x...", "D#4") },
        defaultNote: "D#4",
        vol: 0.6, pan: 0, mute: false, solo: false,
      },
      {
        id: "t-pad", name: "PAD", color: "var(--cyan)",
        module: { type: "pad", params: {} },
        effects: [{ id: "fx-pad-rev", type: "REVERB", params: { size: 3.5, decay: 3.5, mix: 0.4 } }],
        pattern: { steps: pat("x.......x.......", "D#3") },
        defaultNote: "D#3",
        vol: 0.4, pan: 0, mute: false, solo: false,
      },
    ],
  };
}
