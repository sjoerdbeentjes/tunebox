import { registerEffect, registerModule } from "./registry";
import { kickModule } from "./modules/kick";
import { snareModule } from "./modules/snare";
import { hatModule } from "./modules/hat";
import { clapModule } from "./modules/clap";
import { tomModule } from "./modules/tom";
import { bassModule } from "./modules/bass";
import { synthModule } from "./modules/synth";
import { pluckModule } from "./modules/pluck";
import { padModule } from "./modules/pad";
import { filterEffect } from "./effects/filter";
import { eqEffect } from "./effects/eq";
import { driveEffect } from "./effects/drive";
import { delayEffect } from "./effects/delay";
import { reverbEffect } from "./effects/reverb";
import { compEffect } from "./effects/comp";

let registered = false;

export function registerBuiltins(): void {
  if (registered) return;
  registered = true;

  // Instruments — order matters for the browser display.
  for (const m of [kickModule, snareModule, hatModule, clapModule, tomModule, bassModule, synthModule, pluckModule, padModule]) {
    registerModule(m);
  }
  // Effects.
  for (const e of [filterEffect, eqEffect, driveEffect, delayEffect, reverbEffect, compEffect]) {
    registerEffect(e);
  }
}

export * from "./registry";
export type * from "./types";
