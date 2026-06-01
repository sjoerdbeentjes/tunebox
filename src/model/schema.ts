/**
 * Zod validation for the Project JSON.
 *
 * The structural shape is validated here; each module/effect's `params` are
 * validated by looking up its `type` in the registry and applying that plugin's
 * own schema. This keeps validation fully data-driven by the registry.
 */
import { z } from "zod";
import { getEffectDef, getModuleDef } from "../registry/registry";
import { PROJECT_VERSION, type Project } from "./types";

const stepSchema = z.object({
  active: z.boolean(),
  notes: z.array(z.string()),
  velocity: z.number().min(0).max(1),
});

const patternSchema = z.object({
  steps: z.array(stepSchema),
});

const loopSchema = z.object({
  bars: z.number().int().positive(),
  stepsPerBar: z.number().int().positive(),
});

/** Validates module.params against the registered plugin schema for module.type. */
const moduleSchema = z
  .object({
    type: z.string(),
    params: z.record(z.unknown()),
  })
  .superRefine((mod, ctx) => {
    const def = getModuleDef(mod.type);
    if (!def) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown module type "${mod.type}"` });
      return;
    }
    const result = def.schema.safeParse(mod.params);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ["params", ...issue.path] });
      }
    }
  });

const effectSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    params: z.record(z.unknown()),
  })
  .superRefine((fx, ctx) => {
    const def = getEffectDef(fx.type);
    if (!def) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown effect type "${fx.type}"` });
      return;
    }
    const result = def.schema.safeParse(fx.params);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ["params", ...issue.path] });
      }
    }
  });

const trackSchema = z.object({
  id: z.string(),
  name: z.string(),
  module: moduleSchema,
  effects: z.array(effectSchema),
  pattern: patternSchema,
  volume: z.number(),
  pan: z.number().min(-1).max(1),
  muted: z.boolean(),
});

export const projectSchema = z.object({
  version: z.literal(PROJECT_VERSION),
  name: z.string(),
  tempo: z.number().positive(),
  loop: loopSchema,
  tracks: z.array(trackSchema),
});

/**
 * Forward older project versions to the current shape. Currently a no-op
 * identity since v1 is the only version; add cases here as the schema evolves.
 */
export function migrate(raw: unknown): unknown {
  return raw;
}

/** Parse + validate untrusted JSON (string or object) into a typed Project. */
export function validateProject(raw: unknown): Project {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  return projectSchema.parse(migrate(data)) as Project;
}
