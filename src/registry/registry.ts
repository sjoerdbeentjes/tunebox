/**
 * Plugin registries: type -> definition lookup for modules and effects.
 *
 * These are populated once at startup (see ./index.ts) and consulted by the
 * audio engine and the schema validator. Keeping them as simple maps means a
 * new plugin is registered with a single call and discovered everywhere.
 */
import type { EffectDefinition, ModuleDefinition } from "./types";

const modules = new Map<string, ModuleDefinition>();
const effects = new Map<string, EffectDefinition>();

export function registerModule(def: ModuleDefinition): void {
  if (modules.has(def.type)) {
    console.warn(`Module type "${def.type}" is already registered; overwriting.`);
  }
  modules.set(def.type, def as ModuleDefinition);
}

export function registerEffect(def: EffectDefinition): void {
  if (effects.has(def.type)) {
    console.warn(`Effect type "${def.type}" is already registered; overwriting.`);
  }
  effects.set(def.type, def as EffectDefinition);
}

export function getModuleDef(type: string): ModuleDefinition | undefined {
  return modules.get(type);
}

export function getEffectDef(type: string): EffectDefinition | undefined {
  return effects.get(type);
}

export function allModuleDefs(): ModuleDefinition[] {
  return [...modules.values()];
}

export function allEffectDefs(): EffectDefinition[] {
  return [...effects.values()];
}
