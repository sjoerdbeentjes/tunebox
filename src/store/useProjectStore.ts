/**
 * Zustand store holding the Project JSON — the single source of truth.
 *
 * All mutations are immutable replacements; the audio engine subscribes outside
 * React and reconciles its Tone.js graph on every change. UI/action -> JSON ->
 * engine -> sound. Persistence is localStorage; corrupt or stale data falls
 * back to the demo project.
 */
import { create } from "zustand";
import { validateProject } from "../model/schema";
import { createEffect, createTrack, makeId } from "../model/factory";
import type { Project, Step, Track } from "../model/types";
import { totalSteps } from "../model/types";
import { demoProject } from "../demo/demoProject";
import { registerBuiltins, getModuleDef } from "../registry";

registerBuiltins();

const STORAGE_KEY = "tunebox.project.v2";

function loadInitial(): Project {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return validateProject(stored);
  } catch (err) {
    console.warn("Stored project invalid, loading demo:", err);
  }
  return demoProject();
}

function persist(project: Project): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch { /* ignore quota */ }
}

function commit(project: Project): { project: Project } {
  persist(project);
  return { project };
}

function mapTrack(p: Project, id: string, fn: (t: Track) => Track): Project {
  return { ...p, tracks: p.tracks.map((t) => (t.id === id ? fn(t) : t)) };
}

interface ProjectState {
  project: Project;

  // project-level
  setBpm(bpm: number): void;
  setSwing(swing: number): void;
  setMasterVol(v: number): void;
  load(project: Project): void;
  resetToDemo(): void;
  exportJSON(): string;
  importJSON(json: string): void;

  // tracks
  addTrack(moduleType?: string): string;
  removeTrack(id: string): void;
  selectModule(trackId: string, moduleType: string): void;
  appendEffect(trackId: string, effectType: string): void;
  removeEffect(trackId: string, effectId: string): void;
  toggleEffectBypass(trackId: string, effectId: string): void;
  moveEffect(trackId: string, fromIdx: number, dir: -1 | 1): void;
  updateEffectParam(trackId: string, effectId: string, key: string, value: unknown): void;
  setTrack(id: string, patch: Partial<Track>): void;
  setDefaultNote(id: string, note: string): void;
  toggleMute(id: string): void;
  toggleSolo(id: string): void;

  // pattern
  setStep(trackId: string, index: number, step: Step): void;
  toggleStep(trackId: string, index: number): void;
  setStepNote(trackId: string, index: number, note: string): void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: loadInitial(),

  setBpm: (bpm) => set((s) => commit({ ...s.project, bpm: Math.max(40, Math.min(240, Math.round(bpm))) })),
  setSwing: (swing) => set((s) => commit({ ...s.project, swing: Math.max(0, Math.min(0.6, swing)) })),
  setMasterVol: (v) => set((s) => commit({ ...s.project, masterVol: Math.max(0, Math.min(1, v)) })),
  load: (project) => set(commit(project)),
  resetToDemo: () => set(commit(demoProject())),
  exportJSON: () => JSON.stringify(get().project, null, 2),
  importJSON: (json) => set(commit(validateProject(json))),

  addTrack: (moduleType = "synth") => {
    const t = createTrack({ moduleType, loop: get().project.loop });
    set((s) => commit({ ...s.project, tracks: [...s.project.tracks, t] }));
    return t.id;
  },
  removeTrack: (id) => set((s) => {
    if (s.project.tracks.length <= 1) return s; // never remove the last
    return commit({ ...s.project, tracks: s.project.tracks.filter((t) => t.id !== id) });
  }),

  selectModule: (trackId, moduleType) => set((s) => {
    const def = getModuleDef(moduleType);
    if (!def) return s;
    return commit(mapTrack(s.project, trackId, (t) => {
      // Preserve pattern but adapt note semantics: melodic <-> drum.
      const newKind = def.kind;
      const newDefaultNote = def.defaultNote ?? t.defaultNote;
      const steps: Step[] = t.pattern.steps.map((step) => {
        if (!step.active) return step;
        if (newKind === "drum") return { active: true, velocity: step.velocity };
        return { active: true, note: step.note ?? newDefaultNote, velocity: step.velocity };
      });
      return {
        ...t,
        module: { type: moduleType, params: structuredClone(def.defaultParams) as Record<string, unknown> },
        name: def.label,
        color: def.color,
        defaultNote: newDefaultNote,
        pattern: { steps },
      };
    }));
  }),

  appendEffect: (trackId, effectType) => set((s) => {
    const fx = createEffect(effectType);
    return commit(mapTrack(s.project, trackId, (t) => ({ ...t, effects: [...t.effects, fx] })));
  }),

  removeEffect: (trackId, effectId) => set((s) =>
    commit(mapTrack(s.project, trackId, (t) => ({ ...t, effects: t.effects.filter((fx) => fx.id !== effectId) })))),

  toggleEffectBypass: (trackId, effectId) => set((s) =>
    commit(mapTrack(s.project, trackId, (t) => ({
      ...t,
      effects: t.effects.map((fx) => fx.id === effectId ? { ...fx, bypass: !fx.bypass } : fx),
    })))),

  moveEffect: (trackId, fromIdx, dir) => set((s) => commit(mapTrack(s.project, trackId, (t) => {
    const j = fromIdx + dir;
    if (j < 0 || j >= t.effects.length) return t;
    const arr = t.effects.slice();
    [arr[fromIdx], arr[j]] = [arr[j], arr[fromIdx]];
    return { ...t, effects: arr };
  }))),

  updateEffectParam: (trackId, effectId, key, value) => set((s) =>
    commit(mapTrack(s.project, trackId, (t) => ({
      ...t,
      effects: t.effects.map((fx) => fx.id === effectId ? { ...fx, params: { ...fx.params, [key]: value } } : fx),
    })))),

  setTrack: (id, patch) => set((s) => commit(mapTrack(s.project, id, (t) => ({ ...t, ...patch })))),

  setDefaultNote: (id, note) => set((s) => commit(mapTrack(s.project, id, (t) => ({ ...t, defaultNote: note })))),

  toggleMute: (id) => set((s) => commit(mapTrack(s.project, id, (t) => ({ ...t, mute: !t.mute })))),
  toggleSolo: (id) => set((s) => commit(mapTrack(s.project, id, (t) => ({ ...t, solo: !t.solo })))),

  setStep: (trackId, index, step) => set((s) => commit(mapTrack(s.project, trackId, (t) => ({
    ...t,
    pattern: { steps: t.pattern.steps.map((cur, i) => i === index ? step : cur) },
  })))),

  toggleStep: (trackId, index) => set((s) => commit(mapTrack(s.project, trackId, (t) => {
    const cur = t.pattern.steps[index];
    const def = getModuleDef(t.module.type);
    const isMel = def?.kind === "synth";
    const next: Step = cur.active
      ? { active: false }
      : isMel
        ? { active: true, note: cur.note ?? t.defaultNote, velocity: 0.9 }
        : { active: true, velocity: 0.9 };
    return { ...t, pattern: { steps: t.pattern.steps.map((c, i) => i === index ? next : c) } };
  }))),

  setStepNote: (trackId, index, note) => set((s) => commit(mapTrack(s.project, trackId, (t) => ({
    ...t,
    defaultNote: note,
    pattern: { steps: t.pattern.steps.map((c, i) => i === index ? { ...c, active: true, note } : c) },
  })))),
}));

// Helper for components that need step count without subscribing.
export function patternLength(project: Project): number {
  return totalSteps(project.loop);
}

// Re-export id helper for one-off uses.
export { makeId };
