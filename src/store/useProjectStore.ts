/**
 * Zustand store holding the Project JSON — the single source of truth.
 *
 * All mutations are immutable replacements. The audio engine subscribes to this
 * store (outside React) and reconciles the Tone.js graph on every change, so the
 * data flow is strictly one-way: UI/action -> JSON -> engine -> sound.
 */
import { create } from "zustand";
import { validateProject } from "../model/schema";
import type { Project, Track } from "../model/types";
import { demoProject } from "../demo/demoProject";
import { registerBuiltins } from "../registry";

// Registry must be populated before any validation/reconciliation runs.
registerBuiltins();

const STORAGE_KEY = "tunebox.project";

function loadInitial(): Project {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return validateProject(stored);
  } catch (err) {
    console.warn("Failed to load stored project, falling back to demo:", err);
  }
  return demoProject();
}

function persist(project: Project): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch (err) {
    console.warn("Failed to persist project:", err);
  }
}

/** Replace the project, persist it, and return the new state slice. */
function commit(project: Project): { project: Project } {
  persist(project);
  return { project };
}

function mapTrack(project: Project, trackId: string, fn: (t: Track) => Track): Project {
  return {
    ...project,
    tracks: project.tracks.map((t) => (t.id === trackId ? fn(t) : t)),
  };
}

interface ProjectState {
  project: Project;
  load(project: Project): void;
  setTempo(bpm: number): void;
  addTrack(track: Track): void;
  removeTrack(id: string): void;
  updateModuleParams(trackId: string, params: Record<string, unknown>): void;
  updateEffectParams(trackId: string, effectId: string, params: Record<string, unknown>): void;
  toggleStep(trackId: string, index: number): void;
  setStepNotes(trackId: string, index: number, notes: string[], velocity?: number): void;
  exportJSON(): string;
  importJSON(json: string): void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: loadInitial(),

  load: (project) => set(commit(project)),

  setTempo: (bpm) => set((s) => commit({ ...s.project, tempo: bpm })),

  addTrack: (track) =>
    set((s) => commit({ ...s.project, tracks: [...s.project.tracks, track] })),

  removeTrack: (id) =>
    set((s) => commit({ ...s.project, tracks: s.project.tracks.filter((t) => t.id !== id) })),

  updateModuleParams: (trackId, params) =>
    set((s) =>
      commit(
        mapTrack(s.project, trackId, (t) => ({
          ...t,
          module: { ...t.module, params: { ...t.module.params, ...params } },
        })),
      ),
    ),

  updateEffectParams: (trackId, effectId, params) =>
    set((s) =>
      commit(
        mapTrack(s.project, trackId, (t) => ({
          ...t,
          effects: t.effects.map((fx) =>
            fx.id === effectId ? { ...fx, params: { ...fx.params, ...params } } : fx,
          ),
        })),
      ),
    ),

  toggleStep: (trackId, index) =>
    set((s) =>
      commit(
        mapTrack(s.project, trackId, (t) => ({
          ...t,
          pattern: {
            steps: t.pattern.steps.map((step, i) =>
              i === index ? { ...step, active: !step.active } : step,
            ),
          },
        })),
      ),
    ),

  setStepNotes: (trackId, index, notes, velocity) =>
    set((s) =>
      commit(
        mapTrack(s.project, trackId, (t) => ({
          ...t,
          pattern: {
            steps: t.pattern.steps.map((step, i) =>
              i === index
                ? { ...step, notes, active: notes.length > 0, velocity: velocity ?? step.velocity }
                : step,
            ),
          },
        })),
      ),
    ),

  exportJSON: () => JSON.stringify(get().project, null, 2),

  importJSON: (json) => set(commit(validateProject(json))),
}));
