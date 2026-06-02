import * as Tone from "tone";
import { z } from "zod";
import type { ModuleDefinition } from "../types";

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
      trigger(note, time, velocity, duration) {
        if (!note) return;
        synth.triggerAttackRelease(note, duration, time, velocity * 0.6);
      },
      dispose() { synth.dispose(); },
    };
  },
  update() {},
};
