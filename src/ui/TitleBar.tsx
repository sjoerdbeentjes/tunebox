import { useEffect, useState } from "react";
import { Icon, useClock } from "./primitives";

export type View = "seq" | "mix";

export function TitleBar({
  name, onRename, onOpenPicker, view, setView, onAdd, onDel, canDel,
}: {
  name: string;
  onRename: (next: string) => void;
  onOpenPicker: () => void;
  view: View;
  setView: (v: View) => void;
  onAdd: () => void;
  onDel: () => void;
  canDel: boolean;
}) {
  const clock = useClock();
  // Local editable copy so typing doesn't fight the store on every keystroke.
  const [draft, setDraft] = useState(name);
  useEffect(() => { setDraft(name); }, [name]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setDraft(name);
  };

  return (
    <div className="titlebar">
      <div className="tb-logo"><span className="tb-mark">▚▞</span> TERMINAL<span className="tb-dim">_DAW</span></div>
      <div className="tb-file">
        <button className="tb-file-open" onClick={onOpenPicker} title="Open project picker">
          <Icon name="grid" size={12} />
        </button>
        <span className="tb-dim">patch:</span>
        <input
          className="tb-name-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") { (e.currentTarget as HTMLInputElement).blur(); }
            if (e.key === "Escape") { setDraft(name); (e.currentTarget as HTMLInputElement).blur(); }
          }}
          spellCheck={false}
          aria-label="Project name"
        />
        <span className="tb-dot">●</span>
      </div>
      <div className="tb-tabs">
        <button className={"tb-tab" + (view === "seq" ? " on" : "")} onClick={() => setView("seq")}>
          <Icon name="grid" size={12} /> SEQ
        </button>
        <button className={"tb-tab" + (view === "mix" ? " on" : "")} onClick={() => setView("mix")}>
          <Icon name="sliders" size={12} /> MIX
        </button>
      </div>
      <div className="tb-spacer" />
      <div className="tb-actions">
        <button className="tb-btn" onClick={onAdd} title="Add track"><Icon name="plus" size={12} /> TRACK</button>
        <button className="tb-btn danger" onClick={onDel} disabled={!canDel} title="Delete selected track"><Icon name="trash" size={12} /></button>
      </div>
      <div className="tb-clock">{clock}</div>
    </div>
  );
}
