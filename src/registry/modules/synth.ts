import * as Tone from "tone";
import { z } from "zod";
import type { ModuleDefinition } from "../types";

const schema = z.object({});
type P = z.infer<typeof schema>;

export const synthModule: ModuleDefinition<P> = {
  type: "synth",
  label: "SYNTH",
  kind: "synth",
  glyph: "⊓",
  desc: "Square lead synth",
  color: "var(--amber)",
  defaultNote: "C4",
  schema,
  defaultParams: {},

  create() {
    const poly = new Tone.PolySynth(Tone.Synth);
    poly.set({
      oscillator: { type: "square" },
      envelope: { attack: 0.006, decay: 0.45, sustain: 0.25, release: 0.3 },
    });
    return {
      node: poly,
      internal: poly,
      trigger(notes, time, velocity, duration) {
        if (!notes || notes.length === 0) return;
        // PolySynth plays a chord when given an array.
        poly.triggerAttackRelease(notes, duration, time, velocity * 0.5);
      },
      dispose() { poly.dispose(); },
    };
  },
  update() {},
};
