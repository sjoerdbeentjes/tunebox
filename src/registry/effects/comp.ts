import * as Tone from "tone";
import { z } from "zod";
import type { EffectDefinition } from "../types";

const schema = z.object({
  threshold: z.number().min(-60).max(0),
  ratio: z.number().min(1).max(20),
});
type P = z.infer<typeof schema>;

const defaults: P = { threshold: -24, ratio: 4 };

export const compEffect: EffectDefinition<P> = {
  type: "COMP",
  label: "COMP",
  glyph: "◧",
  desc: "Dynamics compressor",
  schema,
  defaultParams: defaults,
  params: [
    { key: "threshold", label: "THRSH", min: -60, max: 0, step: 1, default: -24, unit: "dB" },
    { key: "ratio", label: "RATIO", min: 1, max: 20, step: 0.5, default: 4, unit: ":1" },
  ],
  create(p) {
    return new Tone.Compressor({ threshold: p.threshold, ratio: p.ratio, attack: 0.005, release: 0.15 });
  },
  update(node, p) {
    const c = node as Tone.Compressor;
    c.threshold.value = p.threshold;
    c.ratio.value = p.ratio;
  },
};
