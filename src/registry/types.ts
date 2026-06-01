/**
 * Plugin definition interfaces.
 *
 * A module (instrument) or effect (processor) is registered as a single
 * definition object. Adding a new instrument/effect to Tunebox means writing
 * one of these and calling registerModule/registerEffect once — nothing else in
 * the engine, store, types, or validation needs to change.
 */
import type * as Tone from "tone";
import type { z } from "zod";

/**
 * Triggers one step of a module.
 * @param notes     Notes to play, e.g. ["C4"]. May be empty for rhythmic hits.
 * @param time      Tone.js transport time to schedule at (seconds).
 * @param velocity  0 .. 1.
 * @param duration  Note length in seconds.
 */
export type TriggerFn = (
  notes: string[],
  time: number,
  velocity: number,
  duration: number,
) => void;

/** Runtime handle returned by ModuleDefinition.create — owns the audio node + trigger. */
export interface ModuleHandle {
  /** The node that feeds into the effect chain / channel. */
  node: Tone.ToneAudioNode;
  trigger: TriggerFn;
  /** Plugin-private state (e.g. the underlying synth) for use by update(). */
  internal: unknown;
  dispose(): void;
}

export interface ModuleDefinition<P = Record<string, unknown>> {
  /** Discriminator stored as Module.type in the JSON. */
  type: string;
  /** Human-readable name for UI. */
  label: string;
  /** Validates + types Module.params for this type. */
  schema: z.ZodType<P>;
  /** Params used when creating a fresh instance of this module. */
  defaultParams: P;
  /** Build the audio node + trigger fn. */
  create(params: P): ModuleHandle;
  /** Apply changed params without rebuilding the node, when possible. */
  update(handle: ModuleHandle, params: P): void;
}

export interface EffectDefinition<P = Record<string, unknown>> {
  type: string;
  label: string;
  schema: z.ZodType<P>;
  defaultParams: P;
  create(params: P): Tone.ToneAudioNode;
  update(node: Tone.ToneAudioNode, params: P): void;
}
