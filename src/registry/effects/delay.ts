import * as Tone from "tone";
import { z } from "zod";
import type { EffectDefinition } from "../types";

const schema = z.object({
  time: z.number().min(0.02).max(1.0),
  feedback: z.number().min(0).max(0.9),
  mix: z.number().min(0).max(1),
});
type P = z.infer<typeof schema>;

const defaults: P = { time: 0.28, feedback: 0.35, mix: 0.3 };

export const delayEffect: EffectDefinition<P> = {
  type: "DELAY",
  label: "DELAY",
  glyph: "⋯",
  desc: "Feedback delay line",
  schema,
  defaultParams: defaults,
  params: [
    { key: "time", label: "TIME", min: 0.02, max: 1.0, step: 0.01, default: 0.28, unit: "s" },
    { key: "feedback", label: "FBK", min: 0, max: 0.9, step: 0.01, default: 0.35 },
    { key: "mix", label: "MIX", min: 0, max: 1, step: 0.01, default: 0.3 },
  ],
  create(p) {
    return new Tone.FeedbackDelay({ delayTime: p.time, feedback: p.feedback, wet: p.mix });
  },
  update(node, p) {
    const d = node as Tone.FeedbackDelay;
    d.delayTime.value = p.time;
    d.feedback.value = p.feedback;
    d.wet.value = p.mix;
  },
};
