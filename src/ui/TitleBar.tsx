import { Icon, useClock } from "./primitives";

export type View = "seq" | "mix";

export function TitleBar({ name, view, setView, onAdd, onDel, canDel }: {
  name: string;
  view: View;
  setView: (v: View) => void;
  onAdd: () => void;
  onDel: () => void;
  canDel: boolean;
}) {
  const clock = useClock();
  return (
    <div className="titlebar">
      <div className="tb-logo"><span className="tb-mark">▚▞</span> TERMINAL<span className="tb-dim">_DAW</span></div>
      <div className="tb-file"><span className="tb-dim">patch:</span> {name} <span className="tb-dot">●</span></div>
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
