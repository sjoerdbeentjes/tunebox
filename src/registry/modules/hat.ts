import * as Tone from "tone";
import { z } from "zod";
import type { ModuleDefinition } from "../types";

const schema = z.object({});
type P = z.infer<typeof schema>;

export const hatModule: ModuleDefinition<P> = {
  type: "hat",
  label: "HAT",
  kind: "drum",
  glyph: "×",
  desc: "Filtered noise closed hat",
  color: "var(--cyan)",
  schema,
  defaultParams: {},

  create() {
    const out = new Tone.Gain(0.5);
    const noise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
    });
    const hp = new Tone.Filter(7000, "highpass");
    noise.connect(hp); hp.connect(out);
    return {
      node: out,
      internal: { noise, hp },
      trigger(_n, time, velocity) { noise.triggerAttackRelease("32n", time, velocity * 0.6); },
      dispose() { noise.dispose(); hp.dispose(); out.dispose(); },
    };
  },
  update() {},
};
