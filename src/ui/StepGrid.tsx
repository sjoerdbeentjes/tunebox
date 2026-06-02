import { useEffect, useRef, useState } from "react";
import { Meter } from "./primitives";
import { getModuleDef } from "../registry";
import type { Step, Track } from "../model/types";
import { rootOf, transposeChord } from "./chords";
import { ChordPopover, type ChordPopoverAnchor } from "./ChordPopover";

export function StepGrid({ tracks, step, selectedId, onSelect, onSetStep, onSetStepNotes, onToggleMute, onToggleSolo }: {
  tracks: Track[];
  step: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSetStep: (trackId: string, idx: number, step: Step) => void;
  onSetStepNotes: (trackId: string, idx: number, notes: string[]) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
}) {
  // Drum paint state: while mouse held, write the same value across hovered cells.
  const paint = useRef<{ value: boolean } | null>(null);
  // Melodic drag state: drag a melodic cell vertically to retune (transposes whole chord).
  const meldrag = useRef<{ trackId: string; idx: number; startY: number; startNotes: string[]; moved: boolean } | null>(null);
  // Track stable reference for the mousemove handler.
  const tracksRef = useRef(tracks);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  // Chord popover anchor (right-click / shift+click on a melodic cell).
  const [chord, setChord] = useState<ChordPopoverAnchor | null>(null);

  useEffect(() => {
    const up = () => { paint.current = null; meldrag.current = null; };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  useEffect(() => {
    const move = (ev: MouseEvent) => {
      const d = meldrag.current;
      if (!d) return;
      const dy = d.startY - ev.clientY;
      const semis = Math.round(dy / 10);
      if (Math.abs(dy) > 4) d.moved = true;
      const next = transposeChord(d.startNotes, semis);
      onSetStepNotes(d.trackId, d.idx, next);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [onSetStepNotes]);

  const isMel = (track: Track) => getModuleDef(track.module.type)?.kind === "synth";

  const openChord = (track: Track, idx: number, e: React.MouseEvent) => {
    if (!isMel(track)) return;
    e.preventDefault();
    e.stopPropagation();
    const cur = track.pattern.steps[idx];
    // If the step is off, activate it with the track's default note so the popover has something to edit.
    if (!cur.active) {
      const note = track.defaultNote ?? "C4";
      onSetStepNotes(track.id, idx, [note]);
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setChord({ trackId: track.id, index: idx, rect });
  };

  const cellDown = (track: Track, idx: number, e: React.MouseEvent) => {
    // Right-click or Shift+click on melodic cells opens the chord popover.
    if (isMel(track) && (e.button === 2 || e.shiftKey)) {
      openChord(track, idx, e);
      return;
    }
    const cur = track.pattern.steps[idx];
    if (isMel(track)) {
      if (!cur.active) {
        const note = track.defaultNote ?? "C4";
        onSetStepNotes(track.id, idx, [note]);
        meldrag.current = { trackId: track.id, idx, startY: e.clientY, startNotes: [note], moved: false };
      } else {
        const startNotes = cur.notes && cur.notes.length > 0 ? cur.notes : [track.defaultNote ?? "C4"];
        meldrag.current = { trackId: track.id, idx, startY: e.clientY, startNotes, moved: false };
      }
    } else {
      const nv = !cur.active;
      paint.current = { value: nv };
      onSetStep(track.id, idx, nv ? { active: true, velocity: 0.9 } : { active: false });
    }
  };
  const cellEnter = (track: Track, idx: number) => {
    if (paint.current && !isMel(track)) {
      onSetStep(track.id, idx, paint.current.value ? { active: true, velocity: 0.9 } : { active: false });
    }
  };
  const cellUp = (track: Track, idx: number) => {
    const d = meldrag.current;
    if (d && d.trackId === track.id && d.idx === idx && !d.moved && isMel(track)) {
      // Tap on existing melodic note toggles it off.
      const wasActive = track.pattern.steps[idx].active;
      if (wasActive) onSetStep(track.id, idx, { active: false });
    }
  };

  const chordTrack = chord ? tracks.find((t) => t.id === chord.trackId) ?? null : null;
  const chordStep = chord && chordTrack ? chordTrack.pattern.steps[chord.index] : null;
  const chordNotes = chordStep?.notes ?? (chordStep?.active && chordTrack?.defaultNote ? [chordTrack.defaultNote] : []);

  return (
    <div className="seq">
      <div className="seq-ruler">
        <div className="seq-rowhead-spacer" />
        <div className="seq-cells ruler-cells">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className={"ruler-cell" + (i % 4 === 0 ? " beat" : "") + (step === i ? " play" : "")}>
              {i % 4 === 0 ? (i / 4 + 1) : ""}
            </div>
          ))}
        </div>
      </div>
      <div className="seq-body">
        {tracks.map((t) => {
          const mel = isMel(t);
          const def = getModuleDef(t.module.type);
          return (
            <div key={t.id} className={"seq-row" + (selectedId === t.id ? " sel" : "")} onClick={() => onSelect(t.id)}>
              <div className="seq-rowhead">
                <span className="row-glyph" style={{ color: t.color }}>{def?.glyph}</span>
                <span className="row-name">{t.name}</span>
                <div className="row-ms">
                  <button className={"msbtn" + (t.mute ? " m" : "")} onClick={(e) => { e.stopPropagation(); onToggleMute(t.id); }}>M</button>
                  <button className={"msbtn" + (t.solo ? " s" : "")} onClick={(e) => { e.stopPropagation(); onToggleSolo(t.id); }}>S</button>
                </div>
                <Meter trackId={t.id} w={4} />
              </div>
              <div className="seq-cells">
                {t.pattern.steps.map((s, i) => {
                  const notes = s.notes ?? (s.active && t.defaultNote ? [t.defaultNote] : []);
                  const isChord = mel && s.active && notes.length > 1;
                  const display = mel && s.active ? (notes.length > 0 ? rootOf(notes) : "") : "";
                  return (
                    <div key={i}
                      className={
                        "cell"
                        + (s.active ? " on" : "")
                        + (i % 4 === 0 ? " beat" : "")
                        + (step === i ? " play" : "")
                        + (mel ? " mel" : "")
                        + (isChord ? " chord" : "")
                      }
                      style={s.active ? ({ ["--cc" as string]: t.color } as React.CSSProperties) : undefined}
                      onMouseDown={(e) => { e.stopPropagation(); cellDown(t, i, e); }}
                      onMouseEnter={() => cellEnter(t, i)}
                      onMouseUp={() => cellUp(t, i)}
                      onContextMenu={(e) => { e.preventDefault(); openChord(t, i, e); }}>
                      {mel && s.active ? (
                        <span className="cell-note">
                          {display}
                          {isChord ? <span className="cell-chord-badge">{notes.length}</span> : null}
                        </span>
                      ) : null}
                      {!mel && s.active ? <span className="cell-dot" /> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="seq-hint">click to toggle · drag across drum cells to paint · drag ▲▼ to retune · right-click (or shift-click) melodic cells for chords</div>

      {chord && chordTrack && (
        <ChordPopover
          anchor={chord}
          notes={chordNotes}
          color={chordTrack.color}
          onChange={(next) => {
            if (next.length === 0) onSetStep(chord.trackId, chord.index, { active: false });
            else onSetStepNotes(chord.trackId, chord.index, next);
          }}
          onClose={() => setChord(null)}
        />
      )}
    </div>
  );
}

