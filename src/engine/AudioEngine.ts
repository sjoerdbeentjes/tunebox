/**
 * AudioEngine — reconciles a Tone.js audio graph from the Project JSON.
 *
 * The only place that touches Tone.js. Diffs incoming project state against the
 * cached per-track runtime and applies the minimal change:
 *   - param tweaks         -> def.update(...) in place
 *   - module type change   -> recreate instrument + rewire
 *   - effect chain change  -> rebuild chain + rewire
 *   - track add/remove     -> create / dispose
 *   - pattern edit         -> swap live step buffer (Sequence callback reads it)
 *   - solo activation      -> non-soloed channels muted at the channel node
 *
 * Per track:  module -> fx[0] -> ... -> fx[n] -> Channel -> master bus -> dest
 * Plus per-track Tone.Meter for the level UI and a master Tone.Meter on the bus.
 */
import * as Tone from "tone";
import { getEffectDef, getModuleDef } from "../registry/registry";
import type { ModuleHandle } from "../registry/types";
import { stepVelocity, totalSteps, type LoopConfig, type Project, type Step, type Track } from "../model/types";

interface EffectRuntime {
  id: string;
  type: string;
  bypass: boolean;
  node: Tone.ToneAudioNode;
}

interface TrackRuntime {
  moduleType: string;
  module: ModuleHandle;
  effects: EffectRuntime[];
  channel: Tone.Channel;
  meter: Tone.Meter;
  sequence: Tone.Sequence<number>;
  steps: Step[];
  defaultNote: string | undefined;
  subdivision: string;
  stepCount: number;
}

function subdivisionFor(loop: LoopConfig): string {
  return `${loop.stepsPerBar}n`;
}

/** Chain identity changes only when the structural order of (id,type,bypass) changes. */
function chainKey(effects: { id: string; type: string; bypass?: boolean }[]): string {
  return effects.map((e) => `${e.id}:${e.type}:${e.bypass ? "x" : "_"}`).join("|");
}

export class AudioEngine {
  private tracks = new Map<string, TrackRuntime>();
  private masterBus: Tone.Gain | null = null;
  private masterMeter: Tone.Meter | null = null;
  private metronomeSeq: Tone.Sequence<number> | null = null;
  private metronomeSynth: Tone.Synth | null = null;
  private started = false;
  private metronomeOn = false;

  /** Resume the AudioContext from a user gesture. */
  async init(): Promise<void> {
    if (this.started) return;
    await Tone.start();
    this.ensureMaster();
    this.started = true;
  }

  private ensureMaster(): void {
    if (this.masterBus) return;
    this.masterBus = new Tone.Gain(1).toDestination();
    this.masterMeter = new Tone.Meter({ smoothing: 0.7, normalRange: true });
    this.masterBus.connect(this.masterMeter);
  }

  play(): void { Tone.getTransport().start(); }
  stop(): void { Tone.getTransport().stop(); Tone.getTransport().position = 0; }
  get isPlaying(): boolean { return Tone.getTransport().state === "started"; }

  /** Latest master output level (0..1). UI polls this each frame. */
  getMasterLevel(): number {
    if (!this.masterMeter) return 0;
    const v = this.masterMeter.getValue();
    return typeof v === "number" ? Math.max(0, Math.min(1, v)) : 0;
  }

  /** Latest per-track output level (0..1). */
  getTrackLevel(trackId: string): number {
    const rt = this.tracks.get(trackId);
    if (!rt) return 0;
    const v = rt.meter.getValue();
    return typeof v === "number" ? Math.max(0, Math.min(1, v)) : 0;
  }

  setMetronome(on: boolean): void {
    this.metronomeOn = on;
    this.syncMetronome();
  }

  private syncMetronome(): void {
    if (this.metronomeOn) {
      if (this.metronomeSeq) return;
      this.ensureMaster();
      const synth = new Tone.Synth({
        oscillator: { type: "square" },
        envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
      });
      synth.volume.value = -12;
      synth.connect(this.masterBus!);
      const seq = new Tone.Sequence<number>((time, step) => {
        synth.triggerAttackRelease(step === 0 ? "E5" : "B4", "32n", time);
      }, [0, 1, 2, 3], "4n");
      seq.start(0);
      this.metronomeSynth = synth;
      this.metronomeSeq = seq;
    } else {
      this.metronomeSeq?.dispose();
      this.metronomeSynth?.dispose();
      this.metronomeSeq = null;
      this.metronomeSynth = null;
    }
  }

  /** Apply project state to the audio graph. Safe to call on every change. */
  reconcile(project: Project): void {
    this.ensureMaster();
    const tp = Tone.getTransport();
    tp.bpm.value = project.bpm;
    tp.swing = project.swing;
    // Cast: Tone's Subdivision is a literal union; we know stepsPerBar (e.g. 16) maps to "16n".
    tp.swingSubdivision = `${project.loop.stepsPerBar}n` as Tone.Unit.Subdivision;

    // Mute non-soloed tracks when any track is solo'd.
    const anySolo = project.tracks.some((t) => t.solo);

    // Remove tracks that no longer exist.
    for (const [id, rt] of this.tracks) {
      if (!project.tracks.some((t) => t.id === id)) {
        this.disposeTrack(rt);
        this.tracks.delete(id);
      }
    }

    // Add or update remaining tracks.
    for (const track of project.tracks) {
      const existing = this.tracks.get(track.id);
      if (existing) {
        this.updateTrack(existing, track, project.loop, anySolo);
      } else {
        this.tracks.set(track.id, this.createTrack(track, project.loop, anySolo));
      }
    }

    // Master volume mapping: square the linear control for a finer taper.
    if (this.masterBus) this.masterBus.gain.value = project.masterVol * project.masterVol;
  }

  dispose(): void {
    this.stop();
    for (const rt of this.tracks.values()) this.disposeTrack(rt);
    this.tracks.clear();
    this.metronomeSeq?.dispose(); this.metronomeSynth?.dispose();
    this.masterMeter?.dispose(); this.masterBus?.dispose();
    this.masterBus = null; this.masterMeter = null;
  }

  // ---- internals ---------------------------------------------------------

  private createTrack(track: Track, loop: LoopConfig, anySolo: boolean): TrackRuntime {
    const moduleDef = getModuleDef(track.module.type);
    if (!moduleDef) throw new Error(`Unknown module type "${track.module.type}"`);

    const module = moduleDef.create(track.module.params);
    const effects = track.effects.map((fx) => this.createEffect(fx));
    const channel = new Tone.Channel({
      volume: linearToDb(track.vol),
      pan: track.pan,
      mute: track.mute || (anySolo && !track.solo),
    });
    const meter = new Tone.Meter({ smoothing: 0.7, normalRange: true });
    channel.connect(meter);
    channel.connect(this.masterBus!);

    wireInput(module.node, effects, channel);

    const subdivision = subdivisionFor(loop);
    const stepCount = totalSteps(loop);
    const rt: TrackRuntime = {
      moduleType: track.module.type,
      module, effects, channel, meter,
      steps: track.pattern.steps,
      defaultNote: track.defaultNote,
      subdivision, stepCount,
      sequence: this.createSequence(subdivision, stepCount),
    };
    this.bindSequence(rt);
    rt.sequence.start(0);
    return rt;
  }

  private updateTrack(rt: TrackRuntime, track: Track, loop: LoopConfig, anySolo: boolean): void {
    if (rt.moduleType !== track.module.type) {
      const moduleDef = getModuleDef(track.module.type);
      if (!moduleDef) throw new Error(`Unknown module type "${track.module.type}"`);
      rt.module.dispose();
      rt.module = moduleDef.create(track.module.params);
      rt.moduleType = track.module.type;
      wireInput(rt.module.node, rt.effects, rt.channel);
    } else {
      getModuleDef(track.module.type)?.update(rt.module, track.module.params);
    }

    if (chainKey(rt.effects) !== chainKey(track.effects)) {
      for (const fx of rt.effects) fx.node.dispose();
      rt.effects = track.effects.map((fx) => this.createEffect(fx));
      wireInput(rt.module.node, rt.effects, rt.channel);
    } else {
      track.effects.forEach((fx, i) => getEffectDef(fx.type)?.update(rt.effects[i].node, fx.params));
    }

    rt.channel.volume.value = linearToDb(track.vol);
    rt.channel.pan.value = track.pan;
    rt.channel.mute = track.mute || (anySolo && !track.solo);

    rt.steps = track.pattern.steps;
    rt.defaultNote = track.defaultNote;

    const subdivision = subdivisionFor(loop);
    const stepCount = totalSteps(loop);
    if (subdivision !== rt.subdivision || stepCount !== rt.stepCount) {
      rt.sequence.dispose();
      rt.subdivision = subdivision;
      rt.stepCount = stepCount;
      rt.sequence = this.createSequence(subdivision, stepCount);
      this.bindSequence(rt);
      rt.sequence.start(0);
    }
  }

  private createEffect(fx: { id: string; type: string; params: Record<string, unknown>; bypass?: boolean }): EffectRuntime {
    const def = getEffectDef(fx.type);
    if (!def) throw new Error(`Unknown effect type "${fx.type}"`);
    if (fx.bypass) {
      // A bypassed effect is just a pass-through Gain node — still occupies a chain slot.
      return { id: fx.id, type: fx.type, bypass: true, node: new Tone.Gain(1) };
    }
    return { id: fx.id, type: fx.type, bypass: false, node: def.create(fx.params) };
  }

  private createSequence(subdivision: string, stepCount: number): Tone.Sequence<number> {
    const events = Array.from({ length: stepCount }, (_, i) => i);
    return new Tone.Sequence<number>(() => {}, events, subdivision);
  }

  private bindSequence(rt: TrackRuntime): void {
    rt.sequence.callback = (time, index) => {
      const step = rt.steps[index];
      if (!step?.active) return;
      const duration = Tone.Time(rt.subdivision).toSeconds();
      const note = step.note ?? rt.defaultNote;
      rt.module.trigger(note, time, stepVelocity(step), duration);
      // Tone.Draw schedules a UI-thread callback at audio time — used for playhead sync.
      Tone.Draw.schedule(() => emitStep(index), time);
    };
  }

  private disposeTrack(rt: TrackRuntime): void {
    rt.sequence.dispose();
    rt.module.dispose();
    for (const fx of rt.effects) fx.node.dispose();
    rt.meter.dispose();
    rt.channel.dispose();
  }
}

function wireInput(moduleNode: Tone.ToneAudioNode, effects: EffectRuntime[], channel: Tone.Channel): void {
  moduleNode.disconnect();
  for (const fx of effects) fx.node.disconnect();
  const chain: Tone.ToneAudioNode[] = [moduleNode, ...effects.map((e) => e.node)];
  for (let i = 0; i < chain.length - 1; i++) chain[i].connect(chain[i + 1]);
  chain[chain.length - 1].connect(channel);
}

/** Convert linear 0..1 to dB, with -Infinity at 0 (silent). Channel.volume is dB. */
function linearToDb(v: number): number {
  if (v <= 0.0001) return -Infinity;
  return 20 * Math.log10(v * v); // square the input for a smoother taper
}

// ---- playhead pub/sub (used by the UI to highlight the current step) -----

type StepListener = (step: number) => void;
const stepListeners = new Set<StepListener>();
function emitStep(step: number): void {
  for (const fn of stepListeners) fn(step);
}
export function onStep(fn: StepListener): () => void {
  stepListeners.add(fn);
  return () => { stepListeners.delete(fn); };
}

/** Process-wide singleton. */
export const audioEngine = new AudioEngine();
