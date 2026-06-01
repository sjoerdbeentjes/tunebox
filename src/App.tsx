import { useEffect, useState } from "react";
import { audioEngine } from "./engine/AudioEngine";
import { connectEngine } from "./engine/connectEngine";
import { createTrack } from "./model/factory";
import { useProjectStore } from "./store/useProjectStore";

export default function App() {
  const project = useProjectStore((s) => s.project);
  const setTempo = useProjectStore((s) => s.setTempo);
  const toggleStep = useProjectStore((s) => s.toggleStep);
  const addTrack = useProjectStore((s) => s.addTrack);
  const exportJSON = useProjectStore((s) => s.exportJSON);

  const [playing, setPlaying] = useState(false);

  // Wire the engine to the store once, on mount.
  useEffect(() => {
    connectEngine();
  }, []);

  async function handlePlay() {
    await audioEngine.init(); // resume AudioContext from this user gesture
    audioEngine.play();
    setPlaying(true);
  }

  function handleStop() {
    audioEngine.stop();
    setPlaying(false);
  }

  function handleAddTrack() {
    addTrack(createTrack({ name: `Track ${project.tracks.length + 1}`, moduleType: "synth", loop: project.loop }));
  }

  function handleExport() {
    const json = exportJSON();
    console.log(json);
    void navigator.clipboard?.writeText(json).catch(() => {});
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>🎛️ Tunebox</h1>
        <span style={styles.subtitle}>{project.name}</span>
      </header>

      <section style={styles.transport}>
        {playing ? (
          <button style={styles.btn} onClick={handleStop}>■ Stop</button>
        ) : (
          <button style={styles.btn} onClick={handlePlay}>▶ Play</button>
        )}
        <label style={styles.tempo}>
          Tempo
          <input
            type="number"
            min={40}
            max={240}
            value={project.tempo}
            onChange={(e) => setTempo(Number(e.target.value))}
            style={styles.tempoInput}
          />
          BPM
        </label>
        <button style={styles.btnGhost} onClick={handleAddTrack}>+ Add track</button>
        <button style={styles.btnGhost} onClick={handleExport}>Export JSON</button>
      </section>

      <section style={styles.tracks}>
        {project.tracks.map((track) => (
          <div key={track.id} style={styles.track}>
            <div style={styles.trackHead}>
              <strong>{track.name}</strong>
              <span style={styles.tag}>{track.module.type}</span>
              {track.effects.map((fx) => (
                <span key={fx.id} style={styles.tag}>{fx.type}</span>
              ))}
            </div>
            <div style={styles.steps}>
              {track.pattern.steps.map((step, i) => (
                <button
                  key={i}
                  onClick={() => toggleStep(track.id, i)}
                  title={step.notes.join(", ")}
                  style={{
                    ...styles.step,
                    ...(step.active ? styles.stepOn : null),
                    ...(i % 4 === 0 ? styles.stepBeat : null),
                  }}
                >
                  {step.notes[0] ?? ""}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <p style={styles.hint}>
        Click steps to toggle them. Export logs the full project JSON to the console (and copies it).
      </p>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    fontFamily: "system-ui, sans-serif",
    maxWidth: 900,
    margin: "0 auto",
    padding: 24,
    color: "#e7e7ea",
    background: "#15151a",
    minHeight: "100vh",
  },
  header: { display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 },
  subtitle: { color: "#9a9aa5" },
  transport: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" },
  btn: {
    background: "#6c5ce7",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 16,
    cursor: "pointer",
  },
  btnGhost: {
    background: "transparent",
    color: "#c7c7d1",
    border: "1px solid #3a3a45",
    borderRadius: 8,
    padding: "8px 14px",
    cursor: "pointer",
  },
  tempo: { display: "flex", alignItems: "center", gap: 6, color: "#9a9aa5" },
  tempoInput: {
    width: 64,
    background: "#22222b",
    color: "#e7e7ea",
    border: "1px solid #3a3a45",
    borderRadius: 6,
    padding: "6px 8px",
  },
  tracks: { display: "flex", flexDirection: "column", gap: 16 },
  track: { background: "#1d1d25", borderRadius: 12, padding: 16 },
  trackHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  tag: {
    fontSize: 12,
    background: "#2c2c38",
    color: "#a8a8ff",
    borderRadius: 999,
    padding: "2px 10px",
  },
  steps: { display: "grid", gridTemplateColumns: "repeat(16, 1fr)", gap: 4 },
  step: {
    aspectRatio: "1",
    background: "#26262f",
    border: "1px solid #33333f",
    borderRadius: 6,
    color: "#7a7a88",
    fontSize: 10,
    cursor: "pointer",
  },
  stepOn: { background: "#6c5ce7", color: "white", borderColor: "#6c5ce7" },
  stepBeat: { borderColor: "#4a4a58" },
  hint: { color: "#71717f", marginTop: 24, fontSize: 13 },
};
