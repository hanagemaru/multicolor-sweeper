import { EFFECT_TIMING } from "./game-effects";

type BrowserWindow = Window & { webkitAudioContext?: typeof AudioContext };

export class GameAudio {
  private context: AudioContext | null = null;

  unlock(): void {
    const context = this.getContext();
    if (context?.state === "suspended") void context.resume();
  }

  dispose(): void {
    if (this.context) void this.context.close();
    this.context = null;
  }

  playReveal(delaysMs: readonly number[]): void {
    const context = this.getContext();
    if (!context || delaysMs.length === 0) return;
    const layers = [...new Set(delaysMs)].sort((left, right) => left - right).slice(0, 13);
    layers.forEach((delayMs, index) => {
      const frequency = Math.min(280 + index * 24, 560);
      this.playTone(context, context.currentTime + delayMs / 1000, frequency, 0.045, 0.032, "triangle");
      this.playTone(context, context.currentTime + delayMs / 1000, frequency * 2, 0.025, 0.009, "square");
    });
  }

  playExplosion(): void {
    const context = this.getContext();
    if (!context) return;
    const start = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(125, start);
    oscillator.frequency.exponentialRampToValueAtTime(52, start + 0.18);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.11, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.23);
  }

  playClear(delayMs: number = EFFECT_TIMING.clearJingleDelayMs): void {
    const context = this.getContext();
    if (!context) return;
    const start = context.currentTime + delayMs / 1000;
    [392, 523.25, 659.25, 783.99].forEach((frequency, index) => {
      const noteStart = start + index * 0.075;
      this.playTone(context, noteStart, frequency, 0.11, 0.05, "triangle");
      this.playTone(context, noteStart, frequency * 2, 0.07, 0.012, "square");
    });
  }

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext ?? (window as BrowserWindow).webkitAudioContext;
    if (!AudioContextClass) return null;
    this.context = new AudioContextClass();
    return this.context;
  }

  private playTone(
    context: AudioContext,
    start: number,
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }
}
