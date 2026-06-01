/**
 * Reverb effect — the reference effect plugin.
 *
 * Demonstrates the full EffectDefinition contract: a Zod params schema,
 * defaults, create() (build the Tone node), and update() (apply params live).
 */
import * as Tone from "tone";
import { z } from "zod";
import type { EffectDefinition } from "../types";

const schema = z.object({
  /** Reverb tail length in seconds. */
  decay: z.number().min(0.1),
  /** Dry/wet mix, 0 .. 1. */
  wet: z.number().min(0).max(1),
});

type ReverbParams = z.infer<typeof schema>;

const defaultParams: ReverbParams = { decay: 2.5, wet: 0.3 };

export const reverbEffect: EffectDefinition<ReverbParams> = {
  type: "reverb",
  label: "Reverb",
  schema,
  defaultParams,

  create(params) {
    return new Tone.Reverb({ decay: params.decay, wet: params.wet });
  },

  update(node, params) {
    const reverb = node as Tone.Reverb;
    // `decay` triggers an async impulse-response regen; assign directly.
    reverb.decay = params.decay;
    reverb.wet.value = params.wet;
  },
};
