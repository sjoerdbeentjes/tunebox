/**
 * Tunebox core domain model.
 *
 * The entire project state is a single JSON document. These types describe its
 * shape. They are intentionally stable and plugin-agnostic: the concrete shape
 * of `Module.params` / `Effect.params` is enforced per-`type` by the registry's
 * Zod schemas (see ../model/schema.ts), not here.
 */

/** Current schema version. Bump + add a migration in schema.ts when the shape changes. */
export const PROJECT_VERSION = 1 as const;

export interface Project {
  /** Schema version, used for migrations. */
  version: typeof PROJECT_VERSION;
  name: string;
  /** Beats per minute for the transport. */
  tempo: number;
  loop: LoopConfig;
  tracks: Track[];
}

export interface LoopConfig {
  /** Number of bars in the loop, e.g. 1. */
  bars: number;
  /** Steps per bar, e.g. 16 for sixteenth notes in 4/4. Total steps = bars * stepsPerBar. */
  stepsPerBar: number;
}

export interface Track {
  /** Stable, human-readable id, e.g. "track-bass". */
  id: string;
  name: string;
  /** Exactly one sound source. */
  module: Module;
  /** Ordered processing chain applied after the module. */
  effects: Effect[];
  pattern: Pattern;
  /** Track gain in dB. 0 = unity. */
  volume: number;
  /** Stereo pan, -1 (left) .. 1 (right). */
  pan: number;
  muted: boolean;
}

/** A sound source. `type` selects a ModuleDefinition from the registry. */
export interface Module {
  type: string;
  params: Record<string, unknown>;
}

/** An audio processor. `type` selects an EffectDefinition from the registry. */
export interface Effect {
  id: string;
  type: string;
  params: Record<string, unknown>;
}

export interface Pattern {
  /** One entry per step. Length should equal loop.bars * loop.stepsPerBar. */
  steps: Step[];
}

export interface Step {
  active: boolean;
  /** Notes to trigger, e.g. ["C4", "E4"]. Empty for purely rhythmic hits. */
  notes: string[];
  /** Velocity, 0 .. 1. */
  velocity: number;
}

/** Total number of steps in a loop. */
export function totalSteps(loop: LoopConfig): number {
  return loop.bars * loop.stepsPerBar;
}
