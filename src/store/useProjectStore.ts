/**
 * Zustand store backed by a session library in localStorage.
 *
 * The library is the persistent source of truth: a map of user-owned sessions
 * plus an active pointer. The audio engine reconciles against `project` (the
 * active session's project view). Mutations write through to the library and
 * persist on every change.
 *
 * Built-in demos (src/demo/demos.ts) are read-only code; cloning a demo just
 * adds a new entry to the library, leaving the template untouched.
 */
import { create } from "zustand";
import { validateProject } from "../model/schema";
import { createEffect, createTrack } from "../model/factory";
import type { Project, Step, Track } from "../model/types";
import { totalSteps } from "../model/types";
import { demoProject } from "../demo/demoProject";
import { registerBuiltins, getModuleDef } from "../registry";
import {
  addSession,
  commitActiveProject,
  listSessions,
  loadLibrary,
  removeSession,
  saveLibrary,
  setActiveSession,
  type SessionEntry,
  type SessionLibrary,
} from "../sessions/sessions";
import { findDemo, type DemoEntry } from "../demo/demos";

registerBuiltins();

const initialLibrary = loadLibrary();

function mapTrack(p: Project, id: string, fn: (t: Track) => Track): Project {
  return { ...p, tracks: p.tracks.map((t) => (t.id === id ? fn(t) : t)) };
}

interface ProjectState {
  /** Persisted library of user sessions. */
  library: SessionLibrary;
  /** View of the active session's project (kept in sync with library). */
  project: Project;

  // ---- session actions (touch the library) ----
  listSessions(): SessionEntry[];
  /** Switch the active session. */
  selectSession(id: string): void;
  /** Create a fresh session from the default demo. */
  newSession(): string;
  /** Clone a built-in demo into a new session and activate it. */
  cloneDemo(key: string): string | null;
  /** Clone the currently active session. */
  duplicateActive(): string;
  /** Remove a session. The active session can be removed if it isn't the only one. */
  deleteSession(id: string): void;
  /** Rename the active session (mutates project.name). */
  renameActive(name: string): void;
  /** Import a Project JSON as a new session. Throws on invalid JSON. */
  importJSON(json: string): string;
  /** Serialize the active project as pretty JSON. */
  exportJSON(): string;

  // ---- project-level (active session) ----
  setBpm(bpm: number): void;
  setSwing(swing: number): void;
  setMasterVol(v: number): void;

  // ---- tracks ----
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

  // ---- pattern ----
  setStep(trackId: string, index: number, step: Step): void;
  toggleStep(trackId: string, index: number): void;
  setStepNotes(trackId: string, index: number, notes: string[]): void;
}

export const useProjectStore = create<ProjectState>((set, get) => {
  /** Apply a function to the active project, persist the new library. */
  function patchActive(fn: (p: Project) => Project): void {
    set((s) => {
      const next = fn(s.project);
      const library = commitActiveProject(s.library, next);
      saveLibrary(library);
      return { library, project: next };
    });
  }
  /** Replace the library wholesale (used by session-level actions). */
  function setLibrary(lib: SessionLibrary): void {
    saveLibrary(lib);
    set({ library: lib, project: lib.sessions[lib.activeId].project });
  }

  return {
    library: initialLibrary,
    project: initialLibrary.sessions[initialLibrary.activeId].project,

    listSessions: () => listSessions(get().library),

    selectSession: (id) => {
      const lib = get().library;
      if (!lib.sessions[id] || id === lib.activeId) return;
      setLibrary(setActiveSession(lib, id));
    },

    newSession: () => {
      const lib = addSession(get().library, demoProject());
      setLibrary(lib);
      return lib.activeId;
    },

    cloneDemo: (key) => {
      const demo: DemoEntry | undefined = findDemo(key);
      if (!demo) return null;
      // build() returns a fresh, mutable Project — templates are never edited.
      const lib = addSession(get().library, demo.build());
      setLibrary(lib);
      return lib.activeId;
    },

    duplicateActive: () => {
      const src = get().project;
      // Deep clone + suffix the name so it's visibly distinct.
      const copy: Project = { ...structuredClone(src), name: nextName(src.name, get().library) };
      const lib = addSession(get().library, copy);
      setLibrary(lib);
      return lib.activeId;
    },

    deleteSession: (id) => setLibrary(removeSession(get().library, id)),

    renameActive: (name) => patchActive((p) => ({ ...p, name })),

    importJSON: (json) => {
      const project = validateProject(json);
      const lib = addSession(get().library, project);
      setLibrary(lib);
      return lib.activeId;
    },

    exportJSON: () => JSON.stringify(get().project, null, 2),

    setBpm: (bpm) => patchActive((p) => ({ ...p, bpm: Math.max(40, Math.min(240, Math.round(bpm))) })),
    setSwing: (swing) => patchActive((p) => ({ ...p, swing: Math.max(0, Math.min(0.6, swing)) })),
    setMasterVol: (v) => patchActive((p) => ({ ...p, masterVol: Math.max(0, Math.min(1, v)) })),

    addTrack: (moduleType = "synth") => {
      const t = createTrack({ moduleType, loop: get().project.loop });
      patchActive((p) => ({ ...p, tracks: [...p.tracks, t] }));
      return t.id;
    },
    removeTrack: (id) => patchActive((p) =>
      p.tracks.length <= 1 ? p : { ...p, tracks: p.tracks.filter((t) => t.id !== id) }),

    selectModule: (trackId, moduleType) => {
      const def = getModuleDef(moduleType);
      if (!def) return;
      patchActive((p) => mapTrack(p, trackId, (t) => {
        const newKind = def.kind;
        const newDefaultNote = def.defaultNote ?? t.defaultNote;
        const steps: Step[] = t.pattern.steps.map((step) => {
          if (!step.active) return step;
          if (newKind === "drum") return { active: true, velocity: step.velocity };
          const notes = step.notes && step.notes.length > 0
            ? step.notes
            : (newDefaultNote ? [newDefaultNote] : undefined);
          return { active: true, notes, velocity: step.velocity };
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
    },

    appendEffect: (trackId, effectType) => {
      const fx = createEffect(effectType);
      patchActive((p) => mapTrack(p, trackId, (t) => ({ ...t, effects: [...t.effects, fx] })));
    },
    removeEffect: (trackId, effectId) =>
      patchActive((p) => mapTrack(p, trackId, (t) => ({ ...t, effects: t.effects.filter((fx) => fx.id !== effectId) }))),
    toggleEffectBypass: (trackId, effectId) =>
      patchActive((p) => mapTrack(p, trackId, (t) => ({
        ...t,
        effects: t.effects.map((fx) => fx.id === effectId ? { ...fx, bypass: !fx.bypass } : fx),
      }))),
    moveEffect: (trackId, fromIdx, dir) => patchActive((p) => mapTrack(p, trackId, (t) => {
      const j = fromIdx + dir;
      if (j < 0 || j >= t.effects.length) return t;
      const arr = t.effects.slice();
      [arr[fromIdx], arr[j]] = [arr[j], arr[fromIdx]];
      return { ...t, effects: arr };
    })),
    updateEffectParam: (trackId, effectId, key, value) =>
      patchActive((p) => mapTrack(p, trackId, (t) => ({
        ...t,
        effects: t.effects.map((fx) => fx.id === effectId ? { ...fx, params: { ...fx.params, [key]: value } } : fx),
      }))),

    setTrack: (id, patch) => patchActive((p) => mapTrack(p, id, (t) => ({ ...t, ...patch }))),
    setDefaultNote: (id, note) => patchActive((p) => mapTrack(p, id, (t) => ({ ...t, defaultNote: note }))),
    toggleMute: (id) => patchActive((p) => mapTrack(p, id, (t) => ({ ...t, mute: !t.mute }))),
    toggleSolo: (id) => patchActive((p) => mapTrack(p, id, (t) => ({ ...t, solo: !t.solo }))),

    setStep: (trackId, index, step) => patchActive((p) => mapTrack(p, trackId, (t) => ({
      ...t,
      pattern: { steps: t.pattern.steps.map((cur, i) => i === index ? step : cur) },
    }))),

    toggleStep: (trackId, index) => patchActive((p) => mapTrack(p, trackId, (t) => {
      const cur = t.pattern.steps[index];
      const def = getModuleDef(t.module.type);
      const isMel = def?.kind === "synth";
      const next: Step = cur.active
        ? { active: false }
        : isMel
          ? { active: true, notes: cur.notes ?? (t.defaultNote ? [t.defaultNote] : undefined), velocity: 0.9 }
          : { active: true, velocity: 0.9 };
      return { ...t, pattern: { steps: t.pattern.steps.map((c, i) => i === index ? next : c) } };
    })),

    setStepNotes: (trackId, index, notes) => patchActive((p) => mapTrack(p, trackId, (t) => ({
      ...t,
      defaultNote: notes[0] ?? t.defaultNote,
      pattern: { steps: t.pattern.steps.map((c, i) =>
        i === index ? { ...c, active: notes.length > 0, notes: notes.length > 0 ? notes : undefined } : c,
      ) },
    }))),
  };
});

/** "untitled.daw" -> "untitled-copy.daw"; "untitled-copy.daw" -> "untitled-copy-2.daw" etc. */
function nextName(base: string, lib: SessionLibrary): string {
  const taken = new Set(Object.values(lib.sessions).map((s) => s.project.name));
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  if (!taken.has(`${stem}-copy${ext}`)) return `${stem}-copy${ext}`;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${stem}-copy-${i}${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${stem}-copy${ext}`;
}

export function patternLength(project: Project): number {
  return totalSteps(project.loop);
}
