/**
 * AudioEngine — reconciles a Tone.js audio graph from the Project JSON.
 *
 * The engine is the only place that touches Tone.js. It diffs incoming project
 * state against its cached per-track runtime and applies the minimal change:
 *   - param tweaks  -> def.update(...) in place (no rebuild)
 *   - module swap   -> recreate instrument + rewire
 *   - effect change -> rebuild that track's chain + rewire
 *   - track add/remove -> create / dispose
 *   - pattern edit  -> update the live step buffer the Sequence reads
 *
 * Signal path per track:  module -> fx[0] -> ... -> fx[n] -> Channel -> master
 */
import * as Tone from "tone";
import { getEffectDef, getModuleDef } from "../registry/registry";
import type { ModuleHandle } from "../registry/types";
import { totalSteps, type LoopConfig, type Project, type Step, type Track } from "../model/types";

interface EffectRuntime {
  id: string;
  type: string;
  node: Tone.ToneAudioNode;
}

interface TrackRuntime {
  moduleType: string;
  module: ModuleHandle;
  effects: EffectRuntime[];
  channel: Tone.Channel;
  sequence: Tone.Sequence<number>;
  /** Live, mutable buffer the Sequence callback reads — updated on pattern edits. */
  steps: Step[];
  /** Tone subdivision string, e.g. "16n". */
  subdivision: string;
  stepCount: number;
}

/** Tone subdivision for one step, derived from steps-per-bar (assumes 4/4). */
function subdivisionFor(loop: LoopConfig): string {
  return `${loop.stepsPerBar}n`;
}

/** Identity key for an effect chain: changes only on structural edits. */
function chainKey(effects: { id: string; type: string }[]): string {
  return effects.map((e) => `${e.id}:${e.type}`).join("|");
}

export class AudioEngine {
  private tracks = new Map<string, TrackRuntime>();
  private started = false;

  /** Resume the AudioContext. Must be called from a user gesture. */
  async init(): Promise<void> {
    if (this.started) return;
    await Tone.start();
    this.started = true;
  }

  play(): void {
    Tone.getTransport().start();
  }

  stop(): void {
    Tone.getTransport().stop();
  }

  get isPlaying(): boolean {
    return Tone.getTransport().state === "started";
  }

  /** Apply project state to the audio graph. Safe to call on every change. */
  reconcile(project: Project): void {
    Tone.getTransport().bpm.value = project.tempo;

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
        this.updateTrack(existing, track, project.loop);
      } else {
        this.tracks.set(track.id, this.createTrack(track, project.loop));
      }
    }
  }

  dispose(): void {
    this.stop();
    for (const rt of this.tracks.values()) this.disposeTrack(rt);
    this.tracks.clear();
  }

  // ---- internals ---------------------------------------------------------

  private createTrack(track: Track, loop: LoopConfig): TrackRuntime {
    const moduleDef = getModuleDef(track.module.type);
    if (!moduleDef) throw new Error(`Unknown module type "${track.module.type}"`);

    const module = moduleDef.create(track.module.params);
    const effects = track.effects.map((fx) => this.createEffect(fx));
    const channel = new Tone.Channel({
      volume: track.volume,
      pan: track.pan,
      mute: track.muted,
    }).toDestination();

    wireInput(module.node, effects, channel);

    const subdivision = subdivisionFor(loop);
    const stepCount = totalSteps(loop);
    const rt: TrackRuntime = {
      moduleType: track.module.type,
      module,
      effects,
      channel,
      steps: track.pattern.steps,
      subdivision,
      stepCount,
      sequence: this.createSequence(subdivision, stepCount),
    };
    this.bindSequence(rt);
    rt.sequence.start(0);
    return rt;
  }

  private updateTrack(rt: TrackRuntime, track: Track, loop: LoopConfig): void {
    // Module: recreate on type change, else update params in place.
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

    // Effects: rebuild chain on structural change, else update params in place.
    if (chainKey(rt.effects) !== chainKey(track.effects)) {
      for (const fx of rt.effects) fx.node.dispose();
      rt.effects = track.effects.map((fx) => this.createEffect(fx));
      wireInput(rt.module.node, rt.effects, rt.channel);
    } else {
      track.effects.forEach((fx, i) => getEffectDef(fx.type)?.update(rt.effects[i].node, fx.params));
    }

    // Channel mixer params.
    rt.channel.volume.value = track.volume;
    rt.channel.pan.value = track.pan;
    rt.channel.mute = track.muted;

    // Pattern: swap the live buffer (callback reads it by reference).
    rt.steps = track.pattern.steps;

    // Loop geometry change requires a fresh sequence.
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

  private createEffect(fx: { id: string; type: string; params: Record<string, unknown> }): EffectRuntime {
    const def = getEffectDef(fx.type);
    if (!def) throw new Error(`Unknown effect type "${fx.type}"`);
    return { id: fx.id, type: fx.type, node: def.create(fx.params) };
  }

  private createSequence(subdivision: string, stepCount: number): Tone.Sequence<number> {
    const events = Array.from({ length: stepCount }, (_, i) => i);
    // Callback bound separately so it can close over the current runtime.
    return new Tone.Sequence<number>(() => {}, events, subdivision);
  }

  private bindSequence(rt: TrackRuntime): void {
    rt.sequence.callback = (time, index) => {
      const step = rt.steps[index];
      if (!step?.active) return;
      const duration = Tone.Time(rt.subdivision).toSeconds();
      rt.module.trigger(step.notes, time, step.velocity, duration);
    };
  }

  private disposeTrack(rt: TrackRuntime): void {
    rt.sequence.dispose();
    rt.module.dispose();
    for (const fx of rt.effects) fx.node.dispose();
    rt.channel.dispose();
  }
}

/** Connect module -> effects -> channel, clearing prior input-side wiring first. */
function wireInput(
  moduleNode: Tone.ToneAudioNode,
  effects: EffectRuntime[],
  channel: Tone.Channel,
): void {
  moduleNode.disconnect();
  for (const fx of effects) fx.node.disconnect();

  const chain: Tone.ToneAudioNode[] = [moduleNode, ...effects.map((e) => e.node)];
  for (let i = 0; i < chain.length - 1; i++) chain[i].connect(chain[i + 1]);
  chain[chain.length - 1].connect(channel);
}

/** Process-wide singleton: one engine drives the whole app. */
export const audioEngine = new AudioEngine();
