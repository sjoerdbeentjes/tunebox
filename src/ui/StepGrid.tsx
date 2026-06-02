import { useEffect, useRef } from "react";
import { Meter } from "./primitives";
import { transpose } from "./primitives";
import { getModuleDef } from "../registry";
import type { Step, Track } from "../model/types";

export function StepGrid({ tracks, step, selectedId, onSelect, onSetStep, onToggleMute, onToggleSolo }: {
  tracks: Track[];
  step: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSetStep: (trackId: string, idx: number, step: Step) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
}) {
  // Drum paint state: while mouse held, write the same value across hovered cells.
  const paint = useRef<{ value: boolean } | null>(null);
  // Melodic drag state: drag a melodic cell vertically to retune.
  const meldrag = useRef<{ trackId: string; idx: number; startY: number; startNote: string; moved: boolean } | null>(null);
  // Track stable reference for the mousemove handler.
  const tracksRef = useRef(tracks);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

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
      const next = transpose(d.startNote, semis);
      const t = tracksRef.current.find((x) => x.id === d.trackId);
      if (!t) return;
      const cur = t.pattern.steps[d.idx];
      onSetStep(d.trackId, d.idx, { active: true, note: next, velocity: cur.velocity ?? 0.9 });
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [onSetStep]);

  const isMel = (track: Track) => getModuleDef(track.module.type)?.kind === "synth";

  const cellDown = (track: Track, idx: number, e: React.MouseEvent) => {
    const cur = track.pattern.steps[idx];
    if (isMel(track)) {
      if (!cur.active) {
        const note = track.defaultNote ?? "C4";
        onSetStep(track.id, idx, { active: true, note, velocity: 0.9 });
        meldrag.current = { trackId: track.id, idx, startY: e.clientY, startNote: note, moved: false };
      } else {
        meldrag.current = { trackId: track.id, idx, startY: e.clientY, startNote: cur.note ?? track.defaultNote ?? "C4", moved: false };
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
                {t.pattern.steps.map((s, i) => (
                  <div key={i}
                    className={
                      "cell"
                      + (s.active ? " on" : "")
                      + (i % 4 === 0 ? " beat" : "")
                      + (step === i ? " play" : "")
                      + (mel ? " mel" : "")
                    }
                    style={s.active ? ({ ["--cc" as string]: t.color } as React.CSSProperties) : undefined}
                    onMouseDown={(e) => { e.stopPropagation(); cellDown(t, i, e); }}
                    onMouseEnter={() => cellEnter(t, i)}
                    onMouseUp={() => cellUp(t, i)}>
                    {mel && s.active ? <span className="cell-note">{s.note ?? t.defaultNote ?? ""}</span> : null}
                    {!mel && s.active ? <span className="cell-dot" /> : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="seq-hint">click to toggle · drag across drum cells to paint · drag ▲▼ on melodic cells to pitch</div>
    </div>
  );
}
