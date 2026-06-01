/**
 * Polyphonic synth module — the reference instrument plugin.
 *
 * Demonstrates the full ModuleDefinition contract: a Zod params schema,
 * defaults, create() (build node + trigger), and update() (apply params live).
 */
import * as Tone from "tone";
import { z } from "zod";
import type { ModuleDefinition, ModuleHandle } from "../types";

const oscillatorType = z.enum(["sine", "square", "triangle", "sawtooth"]);

const schema = z.object({
  oscillator: oscillatorType,
  envelope: z.object({
    attack: z.number().min(0),
    decay: z.number().min(0),
    sustain: z.number().min(0).max(1),
    release: z.number().min(0),
  }),
});

type SynthParams = z.infer<typeof schema>;

const defaultParams: SynthParams = {
  oscillator: "triangle",
  envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.4 },
};

function applyParams(synth: Tone.PolySynth, params: SynthParams): void {
  synth.set({
    oscillator: { type: params.oscillator },
    envelope: params.envelope,
  });
}

export const synthModule: ModuleDefinition<SynthParams> = {
  type: "synth",
  label: "Poly Synth",
  schema,
  defaultParams,

  create(params) {
    const synth = new Tone.PolySynth(Tone.Synth);
    applyParams(synth, params);

    const handle: ModuleHandle = {
      node: synth,
      internal: synth,
      trigger(notes, time, velocity, duration) {
        if (notes.length === 0) return;
        synth.triggerAttackRelease(notes, duration, time, velocity);
      },
      dispose() {
        synth.dispose();
      },
    };
    return handle;
  },

  update(handle, params) {
    applyParams(handle.internal as Tone.PolySynth, params);
  },
};
