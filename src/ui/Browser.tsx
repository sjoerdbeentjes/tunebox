import { useState } from "react";
import { Icon } from "./primitives";
import { allEffectDefs, allModuleDefs } from "../registry";
import type { Track } from "../model/types";

type Hover = { name: string; desc: string } | null;

export function Browser({ open, onToggle, onSelectModule, onAddEffect, selTrack }: {
  open: boolean;
  onToggle: () => void;
  onSelectModule: (type: string) => void;
  onAddEffect: (type: string) => void;
  selTrack: Track | null;
}) {
  const [hover, setHover] = useState<Hover>(null);
  if (!open) {
    return (
      <div className="browser closed" onClick={onToggle} title="Open module browser">
        <Icon name="cpu" size={16} />
        <span className="browser-tab-label">MODULES</span>
      </div>
    );
  }
  const modules = allModuleDefs();
  const effects = allEffectDefs();
  return (
    <div className="browser">
      <div className="browser-head">
        <span className="browser-title"><Icon name="cpu" size={13} /> MODULES</span>
        <button className="icon-btn" onClick={onToggle} title="Collapse"><Icon name="x" size={12} /></button>
      </div>
      <div className="browser-scroll">
        <div className="browser-sec-h">// SOURCE — swaps track voice</div>
        {modules.map((m) => (
          <button key={m.type}
            className={"mod-item" + (selTrack && selTrack.module.type === m.type ? " active" : "")}
            onClick={() => onSelectModule(m.type)}
            onMouseEnter={() => setHover({ name: m.label, desc: m.desc })}
            onMouseLeave={() => setHover(null)}>
            <span className="mod-glyph">{m.glyph}</span>
            <span className="mod-name">{m.label}</span>
            <span className={"mod-kind " + m.kind}>{m.kind === "drum" ? "DRM" : "SYN"}</span>
          </button>
        ))}
        <div className="browser-sec-h">// EFFECTS — append to chain</div>
        {effects.map((m) => (
          <button key={m.type} className="mod-item" onClick={() => onAddEffect(m.type)}
            onMouseEnter={() => setHover({ name: m.label, desc: m.desc })}
            onMouseLeave={() => setHover(null)}>
            <span className="mod-glyph">{m.glyph}</span>
            <span className="mod-name">{m.label}</span>
            <span className="mod-kind fx">FX</span>
          </button>
        ))}
      </div>
      <div className="browser-foot">
        {hover ? hover.desc : (selTrack ? `> add to [${selTrack.name}]` : "> select a track")}
      </div>
    </div>
  );
}
