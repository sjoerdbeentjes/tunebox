/**
 * ChordPopover — right-click / shift+click a melodic step to edit its chord.
 *
 * Shows the current notes, a row of preset chord buttons that rebuild the
 * chord against the current root, and ±semitone / ±octave nudges for the root.
 * Rendered through a portal so it can escape the sequencer's overflow.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CHORD_PRESETS, chordFromRoot, detectPreset, rootOf, transposeChord } from "./chords";
import { Icon, transpose } from "./primitives";

export interface ChordPopoverAnchor {
  trackId: string;
  index: number;
  /** Cell bounding-rect in viewport coords; used to position the popover. */
  rect: DOMRect;
}

export function ChordPopover({ anchor, notes, color, onChange, onClose }: {
  anchor: ChordPopoverAnchor;
  notes: string[];
  color: string;
  onChange: (notes: string[]) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape.
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    // Use capture so we run before bubbling handlers that might re-open us.
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const root = notes.length > 0 ? rootOf(notes) : "C4";
  const matchedPreset = detectPreset(notes);

  const applyPreset = (intervals: readonly number[]) => onChange(chordFromRoot(root, intervals));
  const nudge = (semis: number) => onChange(transposeChord(notes.length > 0 ? notes : [root], semis));
  const setRoot = (newRoot: string) => {
    // Preset chord: rebuild on the new root keeping the same intervals.
    // Custom chord: rigid-transpose every note by the root delta.
    if (matchedPreset) {
      onChange(chordFromRoot(newRoot, matchedPreset.intervals));
    } else {
      const delta = semisBetween(root, newRoot);
      onChange(transposeChord(notes.length > 0 ? notes : [root], delta));
    }
  };

  // Position: below the cell when there's room, otherwise above.
  const pad = 6;
  const popH = 156;
  const showAbove = anchor.rect.bottom + popH + pad > window.innerHeight;
  const top = showAbove ? Math.max(8, anchor.rect.top - popH - pad) : anchor.rect.bottom + pad;
  // Right-align if it would overflow.
  const popW = 320;
  const left = Math.max(8, Math.min(window.innerWidth - popW - 8, anchor.rect.left));

  const view = (
    <div
      ref={ref}
      className="chord-pop"
      style={{ position: "fixed", top, left, width: popW, ["--cc" as string]: color } as React.CSSProperties}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="chord-head">
        <span className="chord-title">CHORD</span>
        <span className="chord-root" style={{ color }}>{root}</span>
        <div className="chord-root-ctl">
          <button className="note-btn" onClick={() => setRoot(transpose(root, -12))} title="Octave down">«</button>
          <button className="note-btn" onClick={() => setRoot(transpose(root, -1))}>‹</button>
          <button className="note-btn" onClick={() => setRoot(transpose(root, 1))}>›</button>
          <button className="note-btn" onClick={() => setRoot(transpose(root, 12))} title="Octave up">»</button>
        </div>
        <button className="mod-mini danger" onClick={onClose} title="Close"><Icon name="x" size={11} /></button>
      </div>

      <div className="chord-presets">
        {CHORD_PRESETS.map((p) => (
          <button
            key={p.key}
            className={"chord-preset" + (matchedPreset?.key === p.key ? " on" : "")}
            onClick={() => applyPreset(p.intervals)}
            title={p.intervals.join(", ") + " semitones"}
          >{p.label}</button>
        ))}
      </div>

      <div className="chord-notes">
        <span className="chord-notes-label">NOTES</span>
        <div className="chord-notes-list">
          {notes.length > 0
            ? notes.map((n, i) => <span key={i} className="chord-note" style={{ borderColor: color }}>{n}</span>)
            : <span className="chord-notes-empty">—</span>}
        </div>
        <div className="chord-nudge">
          <button className="note-btn" onClick={() => nudge(-1)} title="Transpose -1">−</button>
          <button className="note-btn" onClick={() => nudge(1)} title="Transpose +1">+</button>
        </div>
      </div>

      <div className="chord-hint">right-click cells to edit · presets rebuild on the current root</div>
    </div>
  );

  return createPortal(view, document.body);
}

/** Semitone distance from `a` to `b` (b - a). */
function semisBetween(a: string, b: string): number {
  // Delegated to chords helper via primitives; inline to avoid extra import.
  const A = parsePitch(a), B = parsePitch(b);
  return B - A;
}
function parsePitch(n: string): number {
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const m = /^([A-G])(#|b)?(-?\d+)$/.exec(n);
  if (!m) return 60;
  let pc = NOTE_NAMES.indexOf(m[1]);
  if (m[2] === "#") pc += 1;
  if (m[2] === "b") pc -= 1;
  return pc + (parseInt(m[3], 10) + 1) * 12;
}
