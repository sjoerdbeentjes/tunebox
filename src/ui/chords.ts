/**
 * Chord presets + helpers.
 *
 * A chord is just a list of pitches. We store the absolute notes (e.g.
 * ["C4","E4","G4"]) on each step — preset names exist only for the picker UI.
 * Detection (notes -> preset label) lets the popover highlight the matching
 * preset after a manual transpose.
 */
import { nameToMidi, midiToName } from "./primitives";

/** Semitone intervals from the root, ordered low-to-high. */
export interface ChordPreset {
  key: string;
  label: string;
  intervals: readonly number[];
}

export const CHORD_PRESETS: readonly ChordPreset[] = [
  { key: "single", label: "—", intervals: [0] },
  { key: "oct", label: "OCT", intervals: [0, 12] },
  { key: "5", label: "5", intervals: [0, 7] },
  { key: "maj", label: "MAJ", intervals: [0, 4, 7] },
  { key: "min", label: "MIN", intervals: [0, 3, 7] },
  { key: "sus2", label: "SUS2", intervals: [0, 2, 7] },
  { key: "sus4", label: "SUS4", intervals: [0, 5, 7] },
  { key: "dim", label: "DIM", intervals: [0, 3, 6] },
  { key: "aug", label: "AUG", intervals: [0, 4, 8] },
  { key: "maj7", label: "MAJ7", intervals: [0, 4, 7, 11] },
  { key: "m7", label: "MIN7", intervals: [0, 3, 7, 10] },
  { key: "7", label: "7", intervals: [0, 4, 7, 10] },
];

/** Build a chord's notes by transposing `root` by each interval. */
export function chordFromRoot(root: string, intervals: readonly number[]): string[] {
  const rootMidi = nameToMidi(root);
  return intervals.map((i) => midiToName(rootMidi + i));
}

/** Compute intervals relative to the lowest note. */
export function intervalsOf(notes: string[]): number[] {
  if (notes.length === 0) return [];
  const midi = notes.map(nameToMidi).sort((a, b) => a - b);
  const root = midi[0];
  return midi.map((m) => m - root);
}

/** Find a matching preset for the given chord, or null if none fits. */
export function detectPreset(notes: string[]): ChordPreset | null {
  if (notes.length === 0) return null;
  const have = intervalsOf(notes).join(",");
  for (const p of CHORD_PRESETS) if (p.intervals.join(",") === have) return p;
  return null;
}

/** Lowest-pitched note ("root") of a chord — used for transposition anchor. */
export function rootOf(notes: string[]): string {
  if (notes.length === 0) return "C4";
  let bestNote = notes[0];
  let bestMidi = nameToMidi(bestNote);
  for (let i = 1; i < notes.length; i++) {
    const m = nameToMidi(notes[i]);
    if (m < bestMidi) { bestMidi = m; bestNote = notes[i]; }
  }
  return bestNote;
}

/** Transpose every note in a chord by `semis` semitones. */
export function transposeChord(notes: string[], semis: number): string[] {
  return notes.map((n) => midiToName(Math.max(0, Math.min(127, nameToMidi(n) + semis))));
}
