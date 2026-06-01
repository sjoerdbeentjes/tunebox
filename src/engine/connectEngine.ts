/**
 * Bridges the JSON store to the audio engine: one subscription, set up once,
 * outside React. Every project change triggers a reconcile — the only path from
 * state to sound.
 */
import { audioEngine } from "./AudioEngine";
import { useProjectStore } from "../store/useProjectStore";

let connected = false;

export function connectEngine(): void {
  if (connected) return;
  connected = true;

  // Apply the current state immediately, then on every change.
  audioEngine.reconcile(useProjectStore.getState().project);
  useProjectStore.subscribe((state) => audioEngine.reconcile(state.project));
}
