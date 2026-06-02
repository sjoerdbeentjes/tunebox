import * as Tone from "tone";
import { z } from "zod";
import type { ModuleDefinition } from "../types";

const schema = z.object({});
type P = z.infer<typeof schema>;

export const pluckModule: ModuleDefinition<P> = {
  type: "pluck",
  label: "PLUCK",
  kind: "synth",
  glyph: "◺",
  desc: "Short triangle pluck",
  color: "var(--amber)",
  defaultNote: "E4",
  schema,
  defaultParams: {},

  create() {
    const poly = new Tone.PolySynth(Tone.Synth);
    poly.set({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.002, decay: 0.22, sustain: 0, release: 0.1 },
    });
    return {
      node: poly,
      internal: poly,
      trigger(note, time, velocity, duration) {
        if (!note) return;
        poly.triggerAttackRelease(note, duration, time, velocity * 0.5);
      },
      dispose() { poly.dispose(); },
    };
  },
  update() {},
};
