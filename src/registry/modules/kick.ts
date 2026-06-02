import * as Tone from "tone";
import { z } from "zod";
import type { ModuleDefinition, ModuleHandle } from "../types";

const schema = z.object({});
type P = z.infer<typeof schema>;

export const kickModule: ModuleDefinition<P> = {
  type: "kick",
  label: "KICK",
  kind: "drum",
  glyph: "◉",
  desc: "Analog-style sine kick w/ pitch envelope",
  color: "var(--grn)",
  schema,
  defaultParams: {},

  create() {
    const synth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4, attackCurve: "exponential" },
    });
    const out = new Tone.Gain(1);
    synth.connect(out);
    const handle: ModuleHandle = {
      node: out,
      internal: synth,
      trigger(_notes, time, velocity) {
        synth.triggerAttackRelease("C1", "8n", time, velocity);
      },
      dispose() { synth.dispose(); out.dispose(); },
    };
    return handle;
  },
  update() { /* no params */ },
};
