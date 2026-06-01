# Tunebox

A loop-based, browser music production tool. The entire project lives in a single
**JSON document** that is the source of truth — the audio engine reconciles a
[Tone.js](https://tonejs.github.io/) graph from it. Everything is modular: adding an
instrument or effect means registering **one definition object**.

```bash
npm install
npm run dev      # open the printed URL, click Play
npm run build    # typecheck + production build
```

## Architecture

```
JSON (Project) ──► Zustand store ──► AudioEngine.reconcile() ──► Tone.js graph ──► sound
     ▲                  ▲                                              ▲
   import/export    UI mutations                              one node-set per track
```

- **`src/model/`** — `types.ts` (the JSON shape), `schema.ts` (Zod validation, params
  validated per-`type` via the registry), `factory.ts` (defaulted constructors).
- **`src/registry/`** — the plugin system. `ModuleDefinition` (instrument) and
  `EffectDefinition` (processor) each carry a Zod `schema`, `defaultParams`, `create()`,
  and `update()`. Registered once in `registry/index.ts`.
- **`src/engine/AudioEngine.ts`** — diffs incoming project state against cached per-track
  runtime and applies the minimal change (param update in place vs. rebuild). Subscribes to
  the store via `connectEngine.ts`.
- **`src/store/useProjectStore.ts`** — the JSON state + immutable mutations.
- **`src/demo/demoProject.ts`** — the example that plays on first load.

## Domain model

A **Track** has exactly one **module** (sound source) and an ordered chain of **effects**
(processors), plus a step **pattern**. Signal path per track:

```
module → fx[0] → … → fx[n] → Channel(volume/pan/mute) → master
```

Patterns are step-based; each step carries `notes[]`, so it serves melodic and rhythmic use.

## Adding a new instrument or effect

Write one file under `src/registry/modules/` or `src/registry/effects/` exporting a
definition, then `registerModule(...)` / `registerEffect(...)` in `registry/index.ts`. No
changes to the engine, store, types, or validation — they're all driven by the registry.

```ts
export const drumSampler: ModuleDefinition<DrumParams> = {
  type: "drumSampler",
  label: "Drum Sampler",
  schema,            // Zod schema for params
  defaultParams,
  create(params) { /* build Tone node + trigger fn */ },
  update(handle, params) { /* apply params live */ },
};
```
