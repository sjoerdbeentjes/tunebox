/**
 * Registry bootstrap. Import this module once at startup to populate the
 * module/effect registries. Adding a new plugin = one import + one register
 * call here (or a self-registering side-effect module).
 */
import { registerEffect, registerModule } from "./registry";
import { synthModule } from "./modules/synth";
import { reverbEffect } from "./effects/reverb";

let registered = false;

export function registerBuiltins(): void {
  if (registered) return;
  registered = true;

  registerModule(synthModule);
  registerEffect(reverbEffect);
}

export * from "./registry";
export type * from "./types";
