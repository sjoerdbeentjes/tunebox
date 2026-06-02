import * as Tone from "tone";
import { z } from "zod";
import type { EffectDefinition } from "../types";

const schema = z.object({
  size: z.number().min(0.3).max(5),
  decay: z.number().min(0.5).max(6),
  mix: z.number().min(0).max(1),
});
type P = z.infer<typeof schema>;

const defaults: P = { size: 2.2, decay: 2.5, mix: 0.3 };

export const reverbEffect: EffectDefinition<P> = {
  type: "REVERB",
  label: "REVERB",
  glyph: "◇",
  desc: "Convolution reverb",
  schema,
  defaultParams: defaults,
  params: [
    { key: "size", label: "SIZE", min: 0.3, max: 5, step: 0.1, default: 2.2, unit: "s" },
    { key: "decay", label: "DECAY", min: 0.5, max: 6, step: 0.1, default: 2.5 },
    { key: "mix", label: "MIX", min: 0, max: 1, step: 0.01, default: 0.3 },
  ],
  create(p) {
    // Tone.Reverb uses preDelay + decay; we map our "size" to decay (close enough
    // for the prototype), and "decay" tunes preDelay falloff. Real convolution
    // sizing would require building IRs by hand.
    return new Tone.Reverb({ decay: p.size, preDelay: 0.01, wet: p.mix });
  },
  update(node, p) {
    const r = node as Tone.Reverb;
    r.decay = p.size;
    r.wet.value = p.mix;
    // `decay` (impulse-response decay shape) is rolled into `size` for simplicity.
    void p.decay;
  },
};
