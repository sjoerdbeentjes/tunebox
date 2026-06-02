import * as Tone from "tone";
import { z } from "zod";
import type { EffectDefinition } from "../types";

const schema = z.object({
  drive: z.number().min(0).max(1),
  level: z.number().min(0).max(1),
});
type P = z.infer<typeof schema>;

const defaults: P = { drive: 0.4, level: 0.7 };

export const driveEffect: EffectDefinition<P> = {
  type: "DRIVE",
  label: "DRIVE",
  glyph: "▲",
  desc: "Waveshaper distortion",
  schema,
  defaultParams: defaults,
  params: [
    { key: "drive", label: "DRIVE", min: 0, max: 1, step: 0.01, default: 0.4 },
    { key: "level", label: "LEVEL", min: 0, max: 1, step: 0.01, default: 0.7 },
  ],
  create(p) {
    // Tone.Distortion is a single node with input/output; we use its `wet` to
    // scale output level (clamped against drive amount).
    const dist = new Tone.Distortion({ distortion: p.drive, oversample: "2x", wet: p.level });
    return dist;
  },
  update(node, p) {
    const d = node as Tone.Distortion;
    d.distortion = p.drive;
    d.wet.value = p.level;
  },
};
