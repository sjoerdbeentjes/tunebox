/**
 * Tunebox / Terminal DAW core domain model.
 *
 * The entire project state is a single JSON document. These types describe its
 * shape. Module/effect `params` are validated per-`type` by the registry's Zod
 * schemas (see ./schema.ts), so the core types stay stable as plugins grow.
 */

/** Bumped to v3 when steps gained chord support (`notes` array replaces single `note`). */
export const PROJECT_VERSION = 3 as const;

export interface Project {
  version: typeof PROJECT_VERSION;
  name: string;
  /** Beats per minute. */
  bpm: number;
  /** Swing amount, 0..0.6 (fraction of a step delay on odd 16ths). */
  swing: number;
  loop: LoopConfig;
  /** Master output volume, 0..1 linear. */
  masterVol: number;
  tracks: Track[];
}

export interface LoopConfig {
  bars: number;
  stepsPerBar: number;
}

export interface Track {
  id: string;
  name: string;
  /** CSS color token used for UI accents, e.g. "var(--grn)". */
  color: string;
  /** Exactly one sound source. */
  module: Module;
  /** Ordered processing chain. */
  effects: Effect[];
  pattern: Pattern;
  /** UI default pitch for new melodic steps, e.g. "C2". Ignored for drums. */
  defaultNote?: string;
  /** Linear volume, 0..1 (engine squares it for taper). */
  vol: number;
  /** Stereo pan, -1..1. */
  pan: number;
  mute: boolean;
  solo: boolean;
}

export interface Module {
  type: string;
  params: Record<string, unknown>;
}

export interface Effect {
  id: string;
  type: string;
  params: Record<string, unknown>;
  bypass?: boolean;
}

export interface Pattern {
  /** One entry per step. Length should equal loop.bars * loop.stepsPerBar. */
  steps: Step[];
}

/**
 * A single step. Drums: only `active` matters. Melodic: `notes` is the chord
 * (one or more pitches like "C4"); when omitted, the track's `defaultNote` is
 * used. Mono-voice instruments play only the first entry.
 */
export interface Step {
  active: boolean;
  notes?: string[];
  /** 0..1, defaults to 0.95 when omitted. */
  velocity?: number;
}

export function totalSteps(loop: LoopConfig): number {
  return loop.bars * loop.stepsPerBar;
}

/** Convenience: velocity with default. */
export function stepVelocity(step: Step): number {
  return step.velocity ?? 0.95;
}
