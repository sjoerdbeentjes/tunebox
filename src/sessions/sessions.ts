/**
 * Session library: stores multiple user projects in localStorage with an
 * active pointer. The single source of truth for persistence.
 *
 * Storage shape (LS key "tunebox.sessions.v1"):
 *   { version: 1, activeId: "...", sessions: { [id]: { id, project, updatedAt } } }
 *
 * On first load, legacy single-project data (`tunebox.project.v2`) is folded
 * into a fresh library so users don't lose work.
 */
import { validateProject } from "../model/schema";
import type { Project } from "../model/types";
import { demoProject } from "../demo/demoProject";

export const LIBRARY_VERSION = 1 as const;
const LS_LIBRARY = "tunebox.sessions.v1";
const LS_LEGACY_PROJECT = "tunebox.project.v2";

export interface SessionEntry {
  id: string;
  project: Project;
  /** ms since epoch. */
  updatedAt: number;
}

export interface SessionLibrary {
  version: typeof LIBRARY_VERSION;
  activeId: string;
  sessions: Record<string, SessionEntry>;
}

let counter = 0;
export function makeSessionId(): string {
  counter += 1;
  return `s-${Date.now().toString(36)}-${counter.toString(36)}`;
}

/** Build a single-session library seeded with `project`. */
export function makeFreshLibrary(project: Project): SessionLibrary {
  const id = makeSessionId();
  return {
    version: LIBRARY_VERSION,
    activeId: id,
    sessions: { [id]: { id, project, updatedAt: Date.now() } },
  };
}

/** Parse + validate every session's project (auto-migrates older Project versions). */
function parseLibrary(raw: string): SessionLibrary {
  const obj = JSON.parse(raw) as unknown;
  if (!obj || typeof obj !== "object") throw new Error("library: not an object");
  const lib = obj as Partial<SessionLibrary>;
  if (lib.version !== LIBRARY_VERSION) throw new Error(`library: unknown version ${lib.version}`);
  if (!lib.sessions || typeof lib.sessions !== "object") throw new Error("library: missing sessions");
  const validated: Record<string, SessionEntry> = {};
  for (const [id, entry] of Object.entries(lib.sessions)) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Partial<SessionEntry>;
    try {
      const project = validateProject(e.project);
      validated[id] = { id, project, updatedAt: typeof e.updatedAt === "number" ? e.updatedAt : Date.now() };
    } catch (err) {
      console.warn(`Dropping invalid session ${id}:`, err);
    }
  }
  if (Object.keys(validated).length === 0) throw new Error("library: no valid sessions");
  const activeId = lib.activeId && validated[lib.activeId]
    ? lib.activeId
    : Object.keys(validated)[0];
  return { version: LIBRARY_VERSION, activeId, sessions: validated };
}

export function loadLibrary(): SessionLibrary {
  // Prefer the new library format.
  try {
    const raw = localStorage.getItem(LS_LIBRARY);
    if (raw) return parseLibrary(raw);
  } catch (err) {
    console.warn("Library invalid, attempting legacy load:", err);
  }
  // Fall back to legacy single-project storage, then drop it.
  try {
    const legacy = localStorage.getItem(LS_LEGACY_PROJECT);
    if (legacy) {
      const project = validateProject(legacy);
      const lib = makeFreshLibrary(project);
      saveLibrary(lib);
      localStorage.removeItem(LS_LEGACY_PROJECT);
      return lib;
    }
  } catch (err) {
    console.warn("Legacy project invalid:", err);
  }
  // Fresh user — start with the default demo.
  const lib = makeFreshLibrary(demoProject());
  saveLibrary(lib);
  return lib;
}

export function saveLibrary(library: SessionLibrary): void {
  try { localStorage.setItem(LS_LIBRARY, JSON.stringify(library)); } catch { /* ignore quota */ }
}

/** Replace the active session's project, bumping updatedAt. */
export function commitActiveProject(library: SessionLibrary, project: Project): SessionLibrary {
  const cur = library.sessions[library.activeId];
  if (!cur) return library;
  return {
    ...library,
    sessions: {
      ...library.sessions,
      [library.activeId]: { ...cur, project, updatedAt: Date.now() },
    },
  };
}

export function addSession(library: SessionLibrary, project: Project): SessionLibrary {
  const id = makeSessionId();
  return {
    ...library,
    activeId: id,
    sessions: { ...library.sessions, [id]: { id, project, updatedAt: Date.now() } },
  };
}

export function removeSession(library: SessionLibrary, id: string): SessionLibrary {
  if (!library.sessions[id]) return library;
  const remaining = Object.fromEntries(
    Object.entries(library.sessions).filter(([k]) => k !== id),
  );
  // Never leave the user without a session — recreate from the default demo if needed.
  if (Object.keys(remaining).length === 0) {
    return makeFreshLibrary(demoProject());
  }
  const activeId = library.activeId === id ? Object.keys(remaining)[0] : library.activeId;
  return { ...library, activeId, sessions: remaining };
}

export function setActiveSession(library: SessionLibrary, id: string): SessionLibrary {
  if (!library.sessions[id]) return library;
  return { ...library, activeId: id };
}

/** Sessions sorted most-recent first. */
export function listSessions(library: SessionLibrary): SessionEntry[] {
  return Object.values(library.sessions).sort((a, b) => b.updatedAt - a.updatedAt);
}
