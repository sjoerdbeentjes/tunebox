import * as Tone from "tone";
import { z } from "zod";
import type { ModuleDefinition } from "../types";

const schema = z.object({});
type P = z.infer<typeof schema>;

export const clapModule: ModuleDefinition<P> = {
  type: "clap",
  label: "CLAP",
  kind: "drum",
  glyph: "≋",
  desc: "Layered band-pass claps",
  color: "var(--amber)",
  schema,
  defaultParams: {},

  create() {
    const out = new Tone.Gain(1);
    const noise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.09, sustain: 0 },
    });
    const bp = new Tone.Filter(1500, "bandpass");
    bp.Q.value = 1.2;
    noise.connect(bp); bp.connect(out);
    return {
      node: out,
      internal: { noise, bp },
      trigger(_notes, time, velocity) {
        // Three quick bursts for the classic clap shape.
        for (let i = 0; i < 3; i++) noise.triggerAttackRelease("16n", time + i * 0.012, velocity * 0.45);
      },
      dispose() { noise.dispose(); bp.dispose(); out.dispose(); },
    };
  },
  update() {},
};
