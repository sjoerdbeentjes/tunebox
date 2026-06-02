/**
 * Terminal DAW app shell — composes the title bar, transport, browser, main
 * view (SEQ/MIX), and the bottom device rack. Boot screen runs first.
 *
 * State flow: useProjectStore is the JSON source of truth. The AudioEngine is
 * connected to the store in main.tsx and reconciles itself on every change.
 * This component only reads the store and dispatches actions; it never touches
 * Tone.js directly.
 */
import { useEffect, useState } from "react";
import * as Tone from "tone";
import { audioEngine, onStep } from "./engine/AudioEngine";
import { useProjectStore } from "./store/useProjectStore";
import { BootScreen } from "./ui/BootScreen";
import { Browser } from "./ui/Browser";
import { Icon } from "./ui/primitives";
import { Mixer } from "./ui/Mixer";
import { Rack } from "./ui/Rack";
import { StepGrid } from "./ui/StepGrid";
import { TitleBar, type View } from "./ui/TitleBar";
import { Transport } from "./ui/Transport";

export default function App() {
  const project = useProjectStore((s) => s.project);
  const setBpm = useProjectStore((s) => s.setBpm);
  const setSwing = useProjectStore((s) => s.setSwing);
  const setMasterVolStore = useProjectStore((s) => s.setMasterVol);
  const addTrack = useProjectStore((s) => s.addTrack);
  const removeTrack = useProjectStore((s) => s.removeTrack);
  const selectModule = useProjectStore((s) => s.selectModule);
  const appendEffect = useProjectStore((s) => s.appendEffect);
  const removeEffect = useProjectStore((s) => s.removeEffect);
  const toggleBypass = useProjectStore((s) => s.toggleEffectBypass);
  const moveEffect = useProjectStore((s) => s.moveEffect);
  const updateEffectParam = useProjectStore((s) => s.updateEffectParam);
  const setTrack = useProjectStore((s) => s.setTrack);
  const setDefaultNote = useProjectStore((s) => s.setDefaultNote);
  const toggleMute = useProjectStore((s) => s.toggleMute);
  const toggleSolo = useProjectStore((s) => s.toggleSolo);
  const setStep = useProjectStore((s) => s.setStep);
  const setStepNotes = useProjectStore((s) => s.setStepNotes);

  const [booted, setBooted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [step, setStepIdx] = useState(-1);
  const [rec, setRec] = useState(false);
  const [loop, setLoop] = useState(true);
  const [metro, setMetro] = useState(false);
  const [view, setView] = useState<View>("seq");
  const [browserOpen, setBrowserOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(project.tracks[0]?.id ?? null);

  // Re-pick a selection if the selected track was removed.
  useEffect(() => {
    if (!project.tracks.some((t) => t.id === selectedId)) {
      setSelectedId(project.tracks[0]?.id ?? null);
    }
  }, [project.tracks, selectedId]);

  // Subscribe to audio-thread step callbacks for the playhead.
  useEffect(() => onStep(setStepIdx), []);

  // Wire transport features that live on the engine, not in the JSON model.
  useEffect(() => { audioEngine.setMetronome(metro); }, [metro]);
  useEffect(() => {
    const tp = Tone.getTransport();
    tp.loop = loop;
    tp.loopStart = 0;
    tp.loopEnd = `${project.loop.bars}m`;
  }, [loop, project.loop.bars]);

  // Keyboard: space toggles play, m/s on selected track.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.code === "Space") { e.preventDefault(); onToggle(); return; }
      if (e.key === "m" && selectedId) toggleMute(selectedId);
      if (e.key === "s" && selectedId) toggleSolo(selectedId);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const onToggle = async () => {
    if (audioEngine.isPlaying) {
      audioEngine.stop();
      setPlaying(false);
      setStepIdx(-1);
    } else {
      await audioEngine.init();
      audioEngine.play();
      setPlaying(true);
    }
  };
  const onStop = () => { audioEngine.stop(); setPlaying(false); setStepIdx(-1); };

  const onAddTrack = () => {
    const id = addTrack("synth");
    setSelectedId(id);
  };
  const onDelTrack = () => { if (selectedId) removeTrack(selectedId); };

  const onAddInstrument = (type: string) => {
    if (!selectedId) return;
    selectModule(selectedId, type);
  };
  const onAddEffect = (type: string) => {
    if (!selectedId) return;
    appendEffect(selectedId, type);
  };

  const selTrack = project.tracks.find((t) => t.id === selectedId) ?? null;

  if (!booted) return <BootScreen onDone={() => setBooted(true)} />;

  return (
    <div className="app">
      <div className="scanlines" />
      <TitleBar
        name={project.name} view={view} setView={setView}
        onAdd={onAddTrack} onDel={onDelTrack}
        canDel={project.tracks.length > 1}
      />
      <Transport
        playing={playing} onToggle={onToggle} onStop={onStop} rec={rec} setRec={setRec}
        bpm={project.bpm} setBpm={setBpm}
        swing={project.swing} setSwing={setSwing}
        metro={metro} setMetro={setMetro} loop={loop} setLoop={setLoop}
        step={step}
        masterVol={project.masterVol} setMasterVol={setMasterVolStore}
      />
      <div className="workspace">
        <Browser
          open={browserOpen} onToggle={() => setBrowserOpen((o) => !o)}
          onSelectModule={onAddInstrument} onAddEffect={onAddEffect}
          selTrack={selTrack}
        />
        <div className="main-view">
          {view === "seq" ? (
            <StepGrid
              tracks={project.tracks} step={step} selectedId={selectedId}
              onSelect={setSelectedId} onSetStep={setStep} onSetStepNotes={setStepNotes}
              onToggleMute={toggleMute} onToggleSolo={toggleSolo}
            />
          ) : (
            <Mixer
              tracks={project.tracks} selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={(id, patch) => setTrack(id, patch)}
              onToggleMute={toggleMute} onToggleSolo={toggleSolo}
              masterVol={project.masterVol} setMasterVol={setMasterVolStore}
            />
          )}
        </div>
      </div>
      <div className="dock">
        <div className="dock-head">
          <span className="dock-title"><Icon name="cpu" size={12} /> DEVICE RACK</span>
          {selTrack && <span className="dock-track" style={{ color: selTrack.color }}>[ {selTrack.name} ]</span>}
          <span className="dock-chain">{selTrack ? (1 + selTrack.effects.length) + " modules" : ""}</span>
        </div>
        <Rack
          track={selTrack}
          onSetDefaultNote={setDefaultNote}
          onParam={updateEffectParam}
          onRemove={removeEffect}
          onBypass={toggleBypass}
          onMove={moveEffect}
          onOpenBrowser={() => setBrowserOpen(true)}
        />
      </div>
    </div>
  );
}
