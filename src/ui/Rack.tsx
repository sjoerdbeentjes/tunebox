import { Fragment } from "react";
import { Icon, Knob, transpose } from "./primitives";
import { getEffectDef, getModuleDef } from "../registry";
import type { Effect, Track } from "../model/types";
import type { ParamSpec } from "../registry/types";

function fmtParam(p: ParamSpec, v: number): string {
  if (p.unit === "Hz") return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : Math.round(v) + "";
  if (p.unit === "dB") return (v > 0 ? "+" : "") + v.toFixed(1);
  if (p.unit === "s") return v.toFixed(2) + "s";
  if (p.unit === ":1") return v.toFixed(1) + ":1";
  if (p.unit === "%") return Math.round(v * 100) + "%";
  return Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2);
}

function SourceModule({ track, onSetDefaultNote }: {
  track: Track;
  onSetDefaultNote: (note: string) => void;
}) {
  const def = getModuleDef(track.module.type);
  if (!def) return null;
  const isMel = def.kind === "synth";
  const note = track.defaultNote ?? def.defaultNote ?? "C4";
  return (
    <div className="module source-mod" style={{ ["--mc" as string]: track.color } as React.CSSProperties}>
      <div className="module-head">
        <span className="module-glyph" style={{ color: track.color }}>{def.glyph}</span>
        <span className="module-title">{def.label}</span>
        <span className="module-tag">SOURCE</span>
      </div>
      <div className="module-body">
        <div className="source-desc">{def.desc}</div>
        {isMel ? (
          <div className="note-ctl">
            <div className="note-label">ROOT NOTE</div>
            <div className="note-stepper">
              <button className="note-btn" onClick={() => onSetDefaultNote(transpose(note, -12))} title="Octave down">«</button>
              <button className="note-btn" onClick={() => onSetDefaultNote(transpose(note, -1))}>‹</button>
              <button className="note-disp" title="Root pitch">{note}</button>
              <button className="note-btn" onClick={() => onSetDefaultNote(transpose(note, 1))}>›</button>
              <button className="note-btn" onClick={() => onSetDefaultNote(transpose(note, 12))} title="Octave up">»</button>
            </div>
            <div className="note-hint">drag steps ▲▼ to pitch each note</div>
          </div>
        ) : (
          <div className="drum-badge">PERCUSSION · one-shot voice</div>
        )}
      </div>
    </div>
  );
}

function EffectModule({ trackId, fx, idx, count, onParam, onRemove, onBypass, onMove }: {
  trackId: string;
  fx: Effect;
  idx: number;
  count: number;
  onParam: (trackId: string, fxId: string, key: string, value: unknown) => void;
  onRemove: (trackId: string, fxId: string) => void;
  onBypass: (trackId: string, fxId: string) => void;
  onMove: (trackId: string, idx: number, dir: -1 | 1) => void;
}) {
  const def = getEffectDef(fx.type);
  if (!def) return null;
  return (
    <div className={"module fx-mod" + (fx.bypass ? " bypassed" : "")}>
      <div className="module-head">
        <span className="module-glyph">{def.glyph}</span>
        <span className="module-title">{def.label}</span>
        <div className="module-acts">
          <button className="mod-mini" disabled={idx === 0} onClick={() => onMove(trackId, idx, -1)} title="Move left">‹</button>
          <button className="mod-mini" disabled={idx === count - 1} onClick={() => onMove(trackId, idx, 1)} title="Move right">›</button>
          <button className={"mod-mini" + (fx.bypass ? " off" : " on")} onClick={() => onBypass(trackId, fx.id)} title="Bypass"><Icon name="power" size={11} /></button>
          <button className="mod-mini danger" onClick={() => onRemove(trackId, fx.id)} title="Remove"><Icon name="x" size={11} /></button>
        </div>
      </div>
      <div className="module-body knobs">
        {def.params.map((p) => p.kind === "enum" ? (
          <div key={p.key} className="enum-ctl">
            <button className="enum-btn" onClick={() => {
              const cur = String(fx.params[p.key] ?? p.default);
              const opts = p.options ?? [];
              const i = opts.indexOf(cur);
              const nx = opts[(i + 1) % opts.length];
              onParam(trackId, fx.id, p.key, nx);
            }}>{String(fx.params[p.key] ?? p.default).slice(0, 4).toUpperCase()}</button>
            <div className="knob-label">{p.label}</div>
          </div>
        ) : (
          <Knob key={p.key}
            value={Number(fx.params[p.key] ?? p.default)}
            min={p.min ?? 0} max={p.max ?? 1} step={p.step ?? 0.01}
            label={p.label} color="var(--grn)"
            fmt={(v) => fmtParam(p, v)}
            onChange={(v) => onParam(trackId, fx.id, p.key, v)} />
        ))}
      </div>
    </div>
  );
}

export function Rack({ track, onSetDefaultNote, onParam, onRemove, onBypass, onMove, onOpenBrowser }: {
  track: Track | null;
  onSetDefaultNote: (trackId: string, note: string) => void;
  onParam: (trackId: string, fxId: string, key: string, value: unknown) => void;
  onRemove: (trackId: string, fxId: string) => void;
  onBypass: (trackId: string, fxId: string) => void;
  onMove: (trackId: string, idx: number, dir: -1 | 1) => void;
  onOpenBrowser: () => void;
}) {
  if (!track) return <div className="rack empty">// no track selected</div>;
  const effects = track.effects;
  return (
    <div className="rack">
      <div className="rack-scroll">
        <SourceModule track={track} onSetDefaultNote={(n) => onSetDefaultNote(track.id, n)} />
        <div className="chain-arrow">→</div>
        {effects.map((fx, i) => (
          <Fragment key={fx.id}>
            <EffectModule trackId={track.id} fx={fx} idx={i} count={effects.length}
              onParam={onParam} onRemove={onRemove} onBypass={onBypass} onMove={onMove} />
            <div className="chain-arrow">→</div>
          </Fragment>
        ))}
        <button className="add-module" onClick={onOpenBrowser} title="Add a module">
          <Icon name="plus" size={18} />
          <span>ADD<br />MODULE</span>
        </button>
        <div className="rack-out">
          <span className="out-glyph">▣</span>
          <span>OUT</span>
        </div>
      </div>
    </div>
  );
}
