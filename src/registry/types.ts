/**
 * Plugin definition interfaces. A new instrument or effect is a single
 * definition object — registry-driven so the engine, UI browser, and schema
 * validator all discover it without any other code changes.
 */
import type * as Tone from "tone";
import type { z } from "zod";

/**
 * Triggers one step of a module at a scheduled transport time.
 * @param note      Pitch as a Tone-compatible string ("C4"), or undefined for drums.
 * @param time      Web Audio time (seconds).
 * @param velocity  0..1.
 * @param duration  Note length in seconds.
 */
export type TriggerFn = (
  note: string | undefined,
  time: number,
  velocity: number,
  duration: number,
) => void;

export interface ModuleHandle {
  /** The node that feeds into the effect chain / channel. */
  node: Tone.ToneAudioNode;
  trigger: TriggerFn;
  /** Plugin-private state for use by update(). */
  internal: unknown;
  dispose(): void;
}

/** Param definition for UI auto-rendering (knob/enum) and value formatting. */
export interface ParamSpec {
  key: string;
  label: string;
  kind?: "number" | "enum";
  min?: number;
  max?: number;
  step?: number;
  default: unknown;
  unit?: string;
  options?: string[];
}

export interface ModuleDefinition<P = Record<string, unknown>> {
  /** Discriminator stored as Module.type in the JSON. */
  type: string;
  label: string;
  /** "drum" = one-shot percussion, "synth" = pitched. */
  kind: "drum" | "synth";
  /** Single glyph for the catalog/title rows. */
  glyph: string;
  /** Short description shown in the browser footer. */
  desc: string;
  /** Color hint (CSS var) used as the default track color when added. */
  color: string;
  /** Default note for melodic modules, e.g. "C4". */
  defaultNote?: string;
  schema: z.ZodType<P>;
  defaultParams: P;
  create(params: P): ModuleHandle;
  update(handle: ModuleHandle, params: P): void;
}

export interface EffectDefinition<P = Record<string, unknown>> {
  type: string;
  label: string;
  glyph: string;
  desc: string;
  schema: z.ZodType<P>;
  defaultParams: P;
  /** UI param specs (for auto-rendering knobs in the rack). */
  params: ParamSpec[];
  create(params: P): Tone.ToneAudioNode;
  update(node: Tone.ToneAudioNode, params: P): void;
}
