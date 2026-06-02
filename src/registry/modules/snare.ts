import * as Tone from "tone";
import { z } from "zod";
import type { ModuleDefinition } from "../types";

const schema = z.object({});
type P = z.infer<typeof schema>;

export const snareModule: ModuleDefinition<P> = {
  type: "snare",
  label: "SNARE",
  kind: "drum",
  glyph: "◈",
  desc: "Noise + tone snare",
  color: "var(--amber)",
  schema,
  defaultParams: {},

  create() {
    const out = new Tone.Gain(1);
    const noise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
    });
    const hp = new Tone.Filter(1200, "highpass");
    noise.connect(hp); hp.connect(out);
    const body = new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.12, sustain: 0 },
    });
    body.volume.value = -10;
    body.connect(out);
    return {
      node: out,
      internal: { noise, body, hp },
      trigger(_n, time, velocity) {
        noise.triggerAttackRelease("16n", time, velocity * 0.7);
        body.triggerAttackRelease("A2", "16n", time, velocity * 0.5);
      },
      dispose() { noise.dispose(); body.dispose(); hp.dispose(); out.dispose(); },
    };
  },
  update() {},
};
