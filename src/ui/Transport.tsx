import { useState } from "react";
import { Icon, MasterMeter } from "./primitives";

export function Transport({
  playing, onToggle, onStop, rec, setRec,
  bpm, setBpm, swing, setSwing,
  metro, setMetro, loop, setLoop,
  step, masterVol, setMasterVol,
}: {
  playing: boolean;
  onToggle: () => void;
  onStop: () => void;
  rec: boolean;
  setRec: (b: boolean) => void;
  bpm: number;
  setBpm: (n: number) => void;
  swing: number;
  setSwing: (n: number) => void;
  metro: boolean;
  setMetro: (b: boolean) => void;
  loop: boolean;
  setLoop: (b: boolean) => void;
  step: number;
  masterVol: number;
  setMasterVol: (v: number) => void;
}) {
  const beat = step >= 0 ? Math.floor(step / 4) + 1 : 1;
  const six = step >= 0 ? (step % 4) + 1 : 1;
  const [bpmDrag, setBpmDrag] = useState(false);

  const bpmDown = (e: React.MouseEvent) => {
    const startY = e.clientY;
    const startV = bpm;
    const move = (ev: MouseEvent) => {
      const v = Math.round(startV + (startY - ev.clientY) / 4);
      setBpm(Math.max(40, Math.min(240, v)));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setBpmDrag(false);
    };
    setBpmDrag(true);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div className="transport">
      <div className="tp-group tp-controls">
        <button className={"tp-btn" + (playing ? " on" : "")} onClick={onToggle} title="Play / Pause [space]">
          <Icon name={playing ? "stop" : "play"} size={15} />
        </button>
        <button className="tp-btn" onClick={onStop} title="Stop & rewind">
          <Icon name="stop" size={13} />
        </button>
        <button className={"tp-btn" + (rec ? " rec" : "")} onClick={() => setRec(!rec)} title="Arm record">
          <Icon name="rec" size={13} />
        </button>
      </div>

      <div className="tp-divider" />

      <div className="tp-group tp-readout">
        <div className="pos">
          <span className="pos-seg">001</span><span className="pos-dot">.</span>
          <span className="pos-seg">{String(beat).padStart(1, "0")}</span><span className="pos-dot">.</span>
          <span className="pos-seg">{six}</span>
        </div>
        <div className="pos-label">BAR.BEAT.STEP</div>
      </div>

      <div className="tp-divider" />

      <div className="tp-group">
        <div className="tp-field bpm" onMouseDown={bpmDown} title="Drag to change tempo">
          <div className={"tp-num" + (bpmDrag ? " drag" : "")}>{bpm}</div>
          <div className="tp-flabel">BPM</div>
        </div>
        <div className="tp-field" title="Swing amount">
          <div className="tp-num sm">{Math.round(swing * 100)}<span className="pct">%</span></div>
          <div className="tp-flabel">SWING</div>
          <input className="micro-slider" type="range" min={0} max={0.6} step={0.01} value={swing}
            onChange={(e) => setSwing(parseFloat(e.target.value))} />
        </div>
      </div>

      <div className="tp-divider" />

      <div className="tp-group tp-toggles">
        <button className={"tp-tog" + (loop ? " on" : "")} onClick={() => setLoop(!loop)} title="Loop"><Icon name="loop" size={14} /></button>
        <button className={"tp-tog" + (metro ? " on" : "")} onClick={() => setMetro(!metro)} title="Metronome"><Icon name="metro" size={14} /></button>
      </div>

      <div className="tp-spacer" />

      <div className="tp-group tp-master">
        <span className="master-lbl">MASTER</span>
        <input className="master-slider" type="range" min={0} max={1} step={0.01} value={masterVol}
          onChange={(e) => setMasterVol(parseFloat(e.target.value))} />
        <MasterMeter />
      </div>
    </div>
  );
}
