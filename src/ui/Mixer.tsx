import { Fader, Knob, MasterMeter, Meter } from "./primitives";
import { getModuleDef } from "../registry";
import type { Track } from "../model/types";

export function Mixer({ tracks, selectedId, onSelect, onChange, onToggleMute, onToggleSolo, masterVol, setMasterVol }: {
  tracks: Track[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<Track>) => void;
  onToggleMute: (id: string) => void;
  onToggleSolo: (id: string) => void;
  masterVol: number;
  setMasterVol: (v: number) => void;
}) {
  return (
    <div className="mixer">
      {tracks.map((t) => {
        const def = getModuleDef(t.module.type);
        return (
          <div key={t.id} className={"strip" + (selectedId === t.id ? " sel" : "")} onClick={() => onSelect(t.id)}>
            <div className="strip-name" style={{ color: t.color }}>{t.name}</div>
            <div className="strip-glyph" style={{ color: t.color }}>{def?.glyph}</div>
            <Knob value={t.pan} min={-1} max={1} step={0.02} size={34} label="PAN" color={t.color}
              fmt={(v) => v === 0 ? "C" : (v < 0 ? "L" + Math.round(-v * 100) : "R" + Math.round(v * 100))}
              onChange={(v) => onChange(t.id, { pan: v })} />
            <div className="strip-fader">
              <div className="strip-meter"><Meter trackId={t.id} vertical /></div>
              <Fader value={t.vol} color={t.color} onChange={(v) => onChange(t.id, { vol: v })} />
            </div>
            <div className="strip-db">{t.vol <= 0 ? "-∞" : (20 * Math.log10(t.vol)).toFixed(1)}</div>
            <div className="strip-ms">
              <button className={"msbtn" + (t.mute ? " m" : "")} onClick={(e) => { e.stopPropagation(); onToggleMute(t.id); }}>M</button>
              <button className={"msbtn" + (t.solo ? " s" : "")} onClick={(e) => { e.stopPropagation(); onToggleSolo(t.id); }}>S</button>
            </div>
            <div className="strip-fx">{t.effects.length} FX</div>
          </div>
        );
      })}
      <div className="strip strip-master">
        <div className="strip-name amber">MASTER</div>
        <div className="strip-glyph amber">▣</div>
        <div className="strip-fader">
          <div className="strip-meter"><MasterMeter /></div>
          <Fader value={masterVol} color="var(--amber)" onChange={setMasterVol} />
        </div>
        <div className="strip-db">{masterVol <= 0 ? "-∞" : (20 * Math.log10(masterVol)).toFixed(1)}</div>
        <div className="strip-ms"><span className="out-lbl">OUT</span></div>
        <div className="strip-fx">2-BUS</div>
      </div>
    </div>
  );
}
