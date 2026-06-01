/**
 * The example project loaded on first run. Doubles as a worked reference for
 * the JSON shape an LLM would read or generate.
 */
import { PROJECT_VERSION, type Project, type Step } from "../model/types";

/** Build a 16-step pattern, placing notes at the given step -> note(s) map. */
function riff(notesByStep: Record<number, string[]>, velocity = 0.8): Step[] {
  return Array.from({ length: 16 }, (_, i) => {
    const notes = notesByStep[i] ?? [];
    return { active: notes.length > 0, notes, velocity: notes.length > 0 ? velocity : 0 };
  });
}

export function demoProject(): Project {
  return {
    version: PROJECT_VERSION,
    name: "Demo Beat",
    tempo: 120,
    loop: { bars: 1, stepsPerBar: 16 },
    tracks: [
      {
        id: "track-lead",
        name: "Lead Synth",
        module: {
          type: "synth",
          params: {
            oscillator: "triangle",
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.4 },
          },
        },
        effects: [{ id: "fx-reverb", type: "reverb", params: { decay: 2.5, wet: 0.3 } }],
        pattern: {
          steps: riff({ 0: ["C4"], 4: ["E4"], 8: ["G4"], 10: ["E4"], 12: ["A4"] }, 0.9),
        },
        volume: -6,
        pan: 0,
        muted: false,
      },
      {
        id: "track-bass",
        name: "Bass",
        module: {
          type: "synth",
          params: {
            oscillator: "sawtooth",
            envelope: { attack: 0.005, decay: 0.2, sustain: 0.2, release: 0.2 },
          },
        },
        effects: [],
        pattern: {
          steps: riff({ 0: ["C2"], 6: ["C2"], 8: ["G2"], 14: ["A2"] }, 0.85),
        },
        volume: -3,
        pan: 0,
        muted: false,
      },
    ],
  };
}
