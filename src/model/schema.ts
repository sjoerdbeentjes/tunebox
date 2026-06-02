/**
 * Zod validation for the Project JSON. Structural shape is validated here;
 * module/effect `params` are validated by looking up the plugin and applying
 * its own schema (data-driven by the registry).
 */
import { z } from "zod";
import { getEffectDef, getModuleDef } from "../registry/registry";
import { PROJECT_VERSION, type Project } from "./types";

const stepSchema = z.object({
  active: z.boolean(),
  note: z.string().optional(),
  velocity: z.number().min(0).max(1).optional(),
});

const patternSchema = z.object({ steps: z.array(stepSchema) });

const loopSchema = z.object({
  bars: z.number().int().positive(),
  stepsPerBar: z.number().int().positive(),
});

const moduleSchema = z
  .object({ type: z.string(), params: z.record(z.unknown()) })
  .superRefine((mod, ctx) => {
    const def = getModuleDef(mod.type);
    if (!def) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown module type "${mod.type}"` }); return; }
    const r = def.schema.safeParse(mod.params);
    if (!r.success) for (const i of r.error.issues) ctx.addIssue({ ...i, path: ["params", ...i.path] });
  });

const effectSchema = z
  .object({ id: z.string(), type: z.string(), params: z.record(z.unknown()), bypass: z.boolean().optional() })
  .superRefine((fx, ctx) => {
    const def = getEffectDef(fx.type);
    if (!def) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown effect type "${fx.type}"` }); return; }
    const r = def.schema.safeParse(fx.params);
    if (!r.success) for (const i of r.error.issues) ctx.addIssue({ ...i, path: ["params", ...i.path] });
  });

const trackSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  module: moduleSchema,
  effects: z.array(effectSchema),
  pattern: patternSchema,
  defaultNote: z.string().optional(),
  vol: z.number().min(0).max(1),
  pan: z.number().min(-1).max(1),
  mute: z.boolean(),
  solo: z.boolean(),
});

export const projectSchema = z.object({
  version: z.literal(PROJECT_VERSION),
  name: z.string(),
  bpm: z.number().min(40).max(240),
  swing: z.number().min(0).max(0.6),
  loop: loopSchema,
  masterVol: z.number().min(0).max(1),
  tracks: z.array(trackSchema),
});

/** Migrate older project shapes forward. No-op currently. */
export function migrate(raw: unknown): unknown {
  return raw;
}

export function validateProject(raw: unknown): Project {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  return projectSchema.parse(migrate(data)) as Project;
}
