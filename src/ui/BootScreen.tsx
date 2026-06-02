import { useEffect, useState } from "react";

const SEQ = [
  "TERMINAL_DAW // audio workstation  rev 0.9.4",
  "COPYRIGHT (C) 2026  — no rights reserved",
  "",
  "init audio context ............. ok",
  "alloc voices [kick snare hat ...] ok",
  "load fx modules [6] ............ ok",
  "mount patch: untitled.daw ...... ok",
  "tracks: 6   steps: 16   bpm: 120",
  "",
  "ready.",
];

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setLines(SEQ.slice(0, i));
      if (i >= SEQ.length) clearInterval(id);
    }, 130);
    const t = setTimeout(onDone, 1900);
    const skip = () => { clearTimeout(t); onDone(); };
    window.addEventListener("keydown", skip);
    window.addEventListener("mousedown", skip);
    return () => {
      clearInterval(id); clearTimeout(t);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("mousedown", skip);
    };
  }, [onDone]);
  return (
    <div className="boot">
      <div className="boot-inner">
        <pre className="boot-log">{lines.map((l, i) => (
          <div key={i} className="boot-line">
            {l ? <span className="boot-prompt">{i >= 3 && l !== "ready." ? "> " : (l === "ready." ? "$ " : "  ")}</span> : null}
            {l}
          </div>
        ))}<div className="boot-cursor">█</div></pre>
        <div className="boot-skip">[ press any key to enter ]</div>
      </div>
    </div>
  );
}
