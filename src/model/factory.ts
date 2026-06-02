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
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}`;
}

export function emptyStep(): Step {
  return { active: false };
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
  name?: string;
  moduleType: string;
  loop: LoopConfig;
  id?: string;
}): Track {
  const def = getModuleDef(opts.moduleType);
  if (!def) throw new Error(`Unknown module type "${opts.moduleType}"`);
  return {
    id: opts.id ?? makeId("track"),
    name: opts.name ?? def.label,
    color: def.color,
    module: createModule(opts.moduleType),
    effects: [],
    pattern: emptyPattern(opts.loop),
    defaultNote: def.defaultNote,
    vol: 0.8,
    pan: 0,
    mute: false,
    solo: false,
  };
}

export function createProject(opts?: Partial<Pick<Project, "name" | "bpm" | "loop" | "swing" | "masterVol">>): Project {
  return {
    version: PROJECT_VERSION,
    name: opts?.name ?? "untitled.daw",
    bpm: opts?.bpm ?? 120,
    swing: opts?.swing ?? 0,
    loop: opts?.loop ?? { bars: 1, stepsPerBar: 16 },
    masterVol: opts?.masterVol ?? 0.85,
    tracks: [],
  };
}
