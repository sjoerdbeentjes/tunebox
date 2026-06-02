import * as Tone from "tone";
import { z } from "zod";
import type { EffectDefinition } from "../types";

const schema = z.object({
  low: z.number().min(-18).max(18),
  mid: z.number().min(-18).max(18),
  high: z.number().min(-18).max(18),
});
type P = z.infer<typeof schema>;

const defaults: P = { low: 0, mid: 0, high: 0 };

export const eqEffect: EffectDefinition<P> = {
  type: "EQ",
  label: "EQ-3",
  glyph: "≣",
  desc: "3-band shelving / peak EQ",
  schema,
  defaultParams: defaults,
  params: [
    { key: "low", label: "LOW", min: -18, max: 18, step: 0.5, default: 0, unit: "dB" },
    { key: "mid", label: "MID", min: -18, max: 18, step: 0.5, default: 0, unit: "dB" },
    { key: "high", label: "HIGH", min: -18, max: 18, step: 0.5, default: 0, unit: "dB" },
  ],
  create(p) {
    return new Tone.EQ3({ low: p.low, mid: p.mid, high: p.high, lowFrequency: 250, highFrequency: 4000 });
  },
  update(node, p) {
    const eq = node as Tone.EQ3;
    eq.low.value = p.low;
    eq.mid.value = p.mid;
    eq.high.value = p.high;
  },
};
