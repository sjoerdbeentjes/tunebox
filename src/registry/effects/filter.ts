import * as Tone from "tone";
import { z } from "zod";
import type { EffectDefinition } from "../types";

const schema = z.object({
  mode: z.enum(["lowpass", "highpass", "bandpass"]),
  freq: z.number().min(80).max(12000),
  q: z.number().min(0.1).max(18),
});
type P = z.infer<typeof schema>;

const defaults: P = { mode: "lowpass", freq: 1200, q: 4 };

export const filterEffect: EffectDefinition<P> = {
  type: "FILTER",
  label: "FILTER",
  glyph: "⊏",
  desc: "State-variable resonant filter",
  schema,
  defaultParams: defaults,
  params: [
    { key: "mode", label: "MODE", kind: "enum", options: ["lowpass", "highpass", "bandpass"], default: "lowpass" },
    { key: "freq", label: "FREQ", min: 80, max: 12000, step: 10, default: 1200, unit: "Hz" },
    { key: "q", label: "RES", min: 0.1, max: 18, step: 0.1, default: 4 },
  ],
  create(p) {
    return new Tone.Filter({ type: p.mode, frequency: p.freq, Q: p.q });
  },
  update(node, p) {
    const f = node as Tone.Filter;
    f.type = p.mode;
    f.frequency.value = p.freq;
    f.Q.value = p.q;
  },
};
