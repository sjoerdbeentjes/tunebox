import * as Tone from "tone";
import { z } from "zod";
import type { ModuleDefinition } from "../types";

const schema = z.object({});
type P = z.infer<typeof schema>;

export const padModule: ModuleDefinition<P> = {
  type: "pad",
  label: "PAD",
  kind: "synth",
  glyph: "☷",
  desc: "Detuned saw pad",
  color: "var(--cyan)",
  defaultNote: "C3",
  schema,
  defaultParams: {},

  create() {
    const poly = new Tone.PolySynth(Tone.Synth);
    poly.set({
      oscillator: { type: "sawtooth" },
      detune: 8,
      envelope: { attack: 0.4, decay: 1.0, sustain: 0.6, release: 1.4 },
    });
    return {
      node: poly,
      internal: poly,
      trigger(notes, time, velocity, duration) {
        if (!notes || notes.length === 0) return;
        poly.triggerAttackRelease(notes, duration, time, velocity * 0.4);
      },
      dispose() { poly.dispose(); },
    };
  },
  update() {},
};
