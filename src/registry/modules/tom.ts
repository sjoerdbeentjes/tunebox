import * as Tone from "tone";
import { z } from "zod";
import type { ModuleDefinition } from "../types";

const schema = z.object({});
type P = z.infer<typeof schema>;

export const tomModule: ModuleDefinition<P> = {
  type: "tom",
  label: "TOM",
  kind: "drum",
  glyph: "◐",
  desc: "Pitched tom drum",
  color: "var(--grn)",
  schema,
  defaultParams: {},

  create() {
    const synth = new Tone.MembraneSynth({
      pitchDecay: 0.1,
      octaves: 3,
      envelope: { attack: 0.002, decay: 0.3, sustain: 0 },
    });
    const out = new Tone.Gain(1);
    synth.connect(out);
    return {
      node: out,
      internal: synth,
      trigger(_n, time, velocity) {
        synth.triggerAttackRelease("A2", "8n", time, velocity * 0.85);
      },
      dispose() { synth.dispose(); out.dispose(); },
    };
  },
  update() {},
};
