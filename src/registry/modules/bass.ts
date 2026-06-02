import * as Tone from "tone";
import { z } from "zod";
import type { ModuleDefinition } from "../types";

/** Return the lowest-pitched note from a chord (by frequency). */
function lowest(notes: string[]): string {
  let bestNote = notes[0];
  let bestFreq = Tone.Frequency(bestNote).toFrequency();
  for (let i = 1; i < notes.length; i++) {
    const f = Tone.Frequency(notes[i]).toFrequency();
    if (f < bestFreq) { bestFreq = f; bestNote = notes[i]; }
  }
  return bestNote;
}

const schema = z.object({});
type P = z.infer<typeof schema>;

export const bassModule: ModuleDefinition<P> = {
  type: "bass",
  label: "BASS",
  kind: "synth",
  glyph: "∿",
  desc: "Saw bass, lp-filter env",
  color: "var(--grn)",
  defaultNote: "C2",
  schema,
  defaultParams: {},

  create() {
    const synth = new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.006, decay: 0.32, sustain: 0.0, release: 0.1 },
      filterEnvelope: { attack: 0.001, decay: 0.32, sustain: 0, release: 0.1, baseFrequency: 400, octaves: 1.8 },
      filter: { Q: 6, type: "lowpass", rolloff: -24 },
    });
    return {
      node: synth,
      internal: synth,
      trigger(notes, time, velocity, duration) {
        // MonoSynth: pick the lowest pitch of the chord as the bass note.
        const note = notes && notes.length > 0 ? lowest(notes) : undefined;
        if (!note) return;
        synth.triggerAttackRelease(note, duration, time, velocity * 0.6);
      },
      dispose() { synth.dispose(); },
    };
  },
  update() {},
};
