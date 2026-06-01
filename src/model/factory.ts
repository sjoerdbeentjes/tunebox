/**
 * Factory helpers for constructing valid model objects with sensible defaults.
 * Pulls default params straight from the registry so new tracks always start
 * from a valid, playable state.
 */
import { getEffectDef, getModuleDef } from "../registry/registry";
import {
  PROJECT_VERSION,
  totalSteps,
  type Effect,
  type LoopConfig,
  type Module,
  type Pattern,
  type Project,
  type Step,
  type Track,
} from "./types";

let counter = 0;
/** Stable-ish id with a readable prefix, e.g. "track-3". */
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function emptyStep(): Step {
  return { active: false, notes: [], velocity: 0 };
}

export function emptyPattern(loop: LoopConfig): Pattern {
  return { steps: Array.from({ length: totalSteps(loop) }, emptyStep) };
}

export function createModule(type: string): Module {
  const def = getModuleDef(type);
  if (!def) throw new Error(`Unknown module type "${type}"`);
  return { type, params: structuredClone(def.defaultParams) as Record<string, unknown> };
}

export function createEffect(type: string): Effect {
  const def = getEffectDef(type);
  if (!def) throw new Error(`Unknown effect type "${type}"`);
  return {
    id: makeId("fx"),
    type,
    params: structuredClone(def.defaultParams) as Record<string, unknown>,
  };
}

export function createTrack(opts: {
  name: string;
  moduleType: string;
  loop: LoopConfig;
  id?: string;
}): Track {
  return {
    id: opts.id ?? makeId("track"),
    name: opts.name,
    module: createModule(opts.moduleType),
    effects: [],
    pattern: emptyPattern(opts.loop),
    volume: 0,
    pan: 0,
    muted: false,
  };
}

export function createProject(opts?: Partial<Pick<Project, "name" | "tempo" | "loop">>): Project {
  return {
    version: PROJECT_VERSION,
    name: opts?.name ?? "Untitled",
    tempo: opts?.tempo ?? 120,
    loop: opts?.loop ?? { bars: 1, stepsPerBar: 16 },
    tracks: [],
  };
}
