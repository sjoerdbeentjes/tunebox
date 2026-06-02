/**
 * ProjectPicker — modal for switching between sessions, cloning demos, and
 * importing JSON. Demos are read-only templates; the only operation on a demo
 * is CLONE, which creates a fresh user session seeded from the template.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./primitives";
import { DEMOS } from "../demo/demos";
import { useProjectStore } from "../store/useProjectStore";

export function ProjectPicker({ onClose }: { onClose: () => void }) {
  const library = useProjectStore((s) => s.library);
  const project = useProjectStore((s) => s.project);
  const selectSession = useProjectStore((s) => s.selectSession);
  const cloneDemo = useProjectStore((s) => s.cloneDemo);
  const newSession = useProjectStore((s) => s.newSession);
  const duplicateActive = useProjectStore((s) => s.duplicateActive);
  const deleteSession = useProjectStore((s) => s.deleteSession);
  const importJSON = useProjectStore((s) => s.importJSON);
  const exportJSON = useProjectStore((s) => s.exportJSON);

  const sessions = useProjectStore((s) => s.listSessions());

  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleClone = (key: string) => {
    cloneDemo(key);
    onClose();
  };
  const handleSelect = (id: string) => {
    selectSession(id);
    onClose();
  };
  const handleNew = () => { newSession(); onClose(); };
  const handleDuplicate = () => { duplicateActive(); onClose(); };
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) return; // never delete the last session
    deleteSession(id);
  };

  const handleExport = async () => {
    const json = exportJSON();
    try { await navigator.clipboard.writeText(json); } catch { /* fallback */ }
    console.log(json);
  };

  const handleImport = () => {
    setImportError(null);
    try {
      importJSON(importText);
      setImporting(false);
      setImportText("");
      onClose();
    } catch (err) {
      setImportError((err as Error).message || "Invalid project JSON");
    }
  };

  const view = (
    <div className="proj-pick-backdrop" onMouseDown={onBackdrop}>
      <div ref={panelRef} className="proj-pick" onMouseDown={(e) => e.stopPropagation()}>
        <div className="proj-pick-head">
          <span className="proj-pick-title"><Icon name="grid" size={13} /> PROJECTS</span>
          <div className="proj-pick-actions">
            <button className="tb-btn" onClick={handleNew} title="New blank session">
              <Icon name="plus" size={11} /> NEW
            </button>
            <button className="tb-btn" onClick={handleDuplicate} title="Duplicate the active session">
              DUPLICATE
            </button>
            <button className="tb-btn" onClick={() => setImporting((v) => !v)} title="Import a project JSON">
              IMPORT
            </button>
            <button className="tb-btn" onClick={handleExport} title="Copy active project JSON to clipboard">
              EXPORT
            </button>
            <button className="icon-btn" onClick={onClose} title="Close"><Icon name="x" size={12} /></button>
          </div>
        </div>

        {importing && (
          <div className="proj-pick-import">
            <textarea
              className="proj-pick-textarea"
              placeholder="paste project JSON here…"
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportError(null); }}
              autoFocus
              spellCheck={false}
            />
            <div className="proj-pick-import-row">
              {importError ? <span className="proj-pick-err">{importError}</span> : <span className="proj-pick-hint">imports as a new session</span>}
              <div className="proj-pick-import-acts">
                <button className="tb-btn" onClick={() => { setImporting(false); setImportError(null); }}>CANCEL</button>
                <button className="tb-btn" onClick={handleImport} disabled={!importText.trim()}>IMPORT</button>
              </div>
            </div>
          </div>
        )}

        <div className="proj-pick-scroll">
          <div className="proj-pick-sec-h">// DEMOS · read-only templates</div>
          {DEMOS.map((d) => (
            <button key={d.key} className="proj-pick-row demo" onClick={() => handleClone(d.key)}
              title={`Clone "${d.name}" into a new session`}>
              <span className="proj-pick-glyph">▸</span>
              <span className="proj-pick-name">{d.name}</span>
              <span className="proj-pick-meta">{d.description}</span>
              <span className="proj-pick-act">CLONE</span>
            </button>
          ))}

          <div className="proj-pick-sec-h">// MY SESSIONS · {sessions.length} saved</div>
          {sessions.map((s) => {
            const isActive = s.id === library.activeId;
            const trackCount = s.project.tracks.length;
            return (
              <button key={s.id} className={"proj-pick-row" + (isActive ? " active" : "")}
                onClick={() => handleSelect(s.id)}
                title={isActive ? "Currently active" : `Open "${s.project.name}"`}>
                <span className="proj-pick-glyph">{isActive ? "●" : "○"}</span>
                <span className="proj-pick-name">{s.project.name}</span>
                <span className="proj-pick-meta">{trackCount} tracks · {relTime(s.updatedAt)}</span>
                <button
                  className="proj-pick-del"
                  onClick={(e) => handleDelete(s.id, e)}
                  disabled={sessions.length <= 1}
                  title={sessions.length <= 1 ? "Can't delete the only session" : "Delete session"}>
                  <Icon name="trash" size={11} />
                </button>
              </button>
            );
          })}
        </div>

        <div className="proj-pick-foot">
          active: <span style={{ color: "var(--grn)" }}>{project.name}</span> · {project.tracks.length} tracks · {project.bpm} bpm
        </div>
      </div>
    </div>
  );

  return createPortal(view, document.body);
}

/** Compact relative time, e.g. "3m ago", "2h ago", "yesterday", "12 Oct". */
function relTime(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  if (d < 2 * 86_400_000) return "yesterday";
  return new Date(ms).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}
