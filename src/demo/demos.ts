/**
 * Built-in demo project registry.
 *
 * Each demo is a `build()` thunk so we always hand the caller a fresh, mutable
 * copy. Demos are read-only templates: clicking one in the picker creates a
 * NEW session seeded from the demo, so editing never mutates the template.
 */
import type { Project, Step } from "../model/types";
import { PROJECT_VERSION } from "../model/types";
import { demoProject } from "./demoProject";

export interface DemoEntry {
  key: string;
  /** Display name (also used as the new session's project.name). */
  name: string;
  description: string;
  build(): Project;
}

/** 16-step builder. 'x' = on. Optional notes for melodic patterns. */
function pat(s: string, notes?: string[], velocity = 0.9): Step[] {
  return s.split("").map((c) => c === "x" ? { active: true, notes, velocity } : { active: false });
}

/** Place a chord at specific step indices; everything else is off. */
function chordsAt(positions: Record<number, string[]>, velocity = 0.8): Step[] {
  return Array.from({ length: 16 }, (_, i) => {
    const notes = positions[i];
    return notes ? { active: true, notes, velocity } : { active: false };
  });
}

function chordsDemo(): Project {
  return {
    version: PROJECT_VERSION,
    name: "chords.daw",
    bpm: 92,
    swing: 0.08,
    loop: { bars: 1, stepsPerBar: 16 },
    masterVol: 0.85,
    tracks: [
      {
        id: "t-kick", name: "KICK", color: "var(--grn)",
        module: { type: "kick", params: {} }, effects: [],
        pattern: { steps: pat("x.......x.......") },
        vol: 0.9, pan: 0, mute: false, solo: false,
      },
      {
        id: "t-hat", name: "HAT", color: "var(--cyan)",
        module: { type: "hat", params: {} }, effects: [],
        pattern: { steps: pat("..x...x...x...x.") },
        vol: 0.5, pan: 0, mute: false, solo: false,
      },
      {
        id: "t-pad", name: "PAD", color: "var(--cyan)",
        module: { type: "pad", params: {} },
        effects: [{ id: "fx-pad-rev", type: "REVERB", params: { size: 3.5, decay: 3.5, mix: 0.45 } }],
        // I - vi - IV - V progression in C: Cmaj7, Am7, Fmaj7, G7
        pattern: { steps: chordsAt({
          0: ["C3", "E3", "G3", "B3"],
          4: ["A2", "C3", "E3", "G3"],
          8: ["F2", "A2", "C3", "E3"],
          12: ["G2", "B2", "D3", "F3"],
        }, 0.7) },
        defaultNote: "C3",
        vol: 0.55, pan: 0, mute: false, solo: false,
      },
      {
        id: "t-pluck", name: "PLUCK", color: "var(--amber)",
        module: { type: "pluck", params: {} },
        effects: [{ id: "fx-pluck-dly", type: "DELAY", params: { time: 0.28, feedback: 0.4, mix: 0.35 } }],
        pattern: { steps: pat("x.x.x.x.x.x.x.x.", ["E5"], 0.7) },
        defaultNote: "E5",
        vol: 0.5, pan: 0, mute: false, solo: false,
      },
    ],
  };
}

function technoDemo(): Project {
  return {
    version: PROJECT_VERSION,
    name: "techno.daw",
    bpm: 128,
    swing: 0,
    loop: { bars: 1, stepsPerBar: 16 },
    masterVol: 0.85,
    tracks: [
      {
        id: "t-kick", name: "KICK", color: "var(--grn)",
        module: { type: "kick", params: {} }, effects: [],
        pattern: { steps: pat("x...x...x...x...") },
        vol: 0.95, pan: 0, mute: false, solo: false,
      },
      {
        id: "t-clap", name: "CLAP", color: "var(--amber)",
        module: { type: "clap", params: {} }, effects: [],
        pattern: { steps: pat("....x.......x...") },
        vol: 0.7, pan: 0, mute: false, solo: false,
      },
      {
        id: "t-hat", name: "HAT", color: "var(--cyan)",
        module: { type: "hat", params: {} }, effects: [],
        pattern: { steps: pat(".x.x.x.x.x.x.x.x") },
        vol: 0.45, pan: 0, mute: false, solo: false,
      },
      {
        id: "t-bass", name: "BASS", color: "var(--grn)",
        module: { type: "bass", params: {} },
        effects: [
          { id: "fx-bass-flt", type: "FILTER", params: { mode: "lowpass", freq: 900, q: 6 } },
          { id: "fx-bass-drv", type: "DRIVE", params: { drive: 0.25, level: 0.8 } },
        ],
        pattern: { steps: pat("x.....x...x.....", ["A1"]) },
        defaultNote: "A1",
        vol: 0.85, pan: 0, mute: false, solo: false,
      },
      {
        id: "t-stab", name: "STAB", color: "var(--amber)",
        module: { type: "synth", params: {} },
        effects: [{ id: "fx-stab-dly", type: "DELAY", params: { time: 0.18, feedback: 0.45, mix: 0.4 } }],
        // Off-beat minor stabs
        pattern: { steps: chordsAt({ 6: ["A4", "C5", "E5"], 14: ["E4", "G4", "B4"] }, 0.55) },
        defaultNote: "A4",
        vol: 0.5, pan: 0, mute: false, solo: false,
      },
    ],
  };
}

export const DEMOS: readonly DemoEntry[] = [
  {
    key: "default",
    name: "untitled.daw",
    description: "Default Terminal DAW patch — drums, bass, pluck, pad",
    build: demoProject,
  },
  {
    key: "chords",
    name: "chords.daw",
    description: "I–vi–IV–V chord progression with pluck arpeggio",
    build: chordsDemo,
  },
  {
    key: "techno",
    name: "techno.daw",
    description: "128 BPM minimal techno — driven bass, off-beat stabs",
    build: technoDemo,
  },
];

export function findDemo(key: string): DemoEntry | undefined {
  return DEMOS.find((d) => d.key === key);
}
