import { countedRevealPlan, type ClearVariant, type ExplosionVariant } from "./effects-lab-model";

type BrowserWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Comparison-only audio synth. It stays in the lazy-loaded Effect Lab chunk. */
export class EffectsLabAudio {
  private context: AudioContext | null = null;

  unlock(): void {
    const context = this.getContext();
    if (context?.state === "suspended") void context.resume();
  }

  dispose(): void {
    if (this.context) void this.context.close();
    this.context = null;
  }

  playCountedReveal(revealedCount: number): void {
    const context = this.getContext();
    if (!context) return;
    const plan = countedRevealPlan(revealedCount);
    const start = context.currentTime;
    const pitch = 2 ** (plan.pitchShiftSemitones / 12);

    for (let index = 0; index < plan.pulseCount; index += 1) {
      const noteStart = start + index * plan.intervalMs / 1000;
      const frequency = Math.min(270 * pitch * 2 ** (index * 1.2 / 12), 560);
      this.tone(context, noteStart, frequency, 0.052, 0.031, "triangle");
      this.tone(context, noteStart, frequency * 2, 0.03, 0.009, "square");
    }

    if (plan.finalLayers > 0) {
      const finish = start + Math.max(0.09, (plan.pulseCount - 1) * plan.intervalMs / 1000 + 0.05);
      const frequencies = plan.finalLayers === 2 ? [659.25, 783.99] : [523.25, 659.25, 783.99];
      frequencies.forEach((frequency, index) => {
        this.tone(context, finish + index * 0.012, frequency * pitch, 0.085, 0.022, "triangle");
        this.tone(context, finish + index * 0.012, frequency * 2 * pitch, 0.045, 0.006, "square");
      });
      this.tone(context, start, 145 * pitch, 0.1, 0.011, "triangle");
    }
  }

  playExplosion(variant: ExplosionVariant): void {
    const context = this.getContext();
    if (!context) return;
    const start = context.currentTime;
    if (variant === "pixel") {
      this.boom(context, start, 0.12);
      this.tone(context, start + 0.006, 510, 0.035, 0.012, "square");
      return;
    }
    if (variant === "cinematic") {
      this.sweep(context, start, 980, 1950, 0.2, 0.026, "sine");
      this.tone(context, start + 0.16, 2350, 0.055, 0.012, "sine");
      this.boom(context, start + 0.22, 0.19);
      this.sweep(context, start + 0.22, 98, 34, 0.42, 0.16, "triangle");
      this.tone(context, start + 0.23, 46, 0.38, 0.07, "square");
      this.tone(context, start + 0.225, 620, 0.055, 0.018, "square");
      return;
    }
    this.boom(context, start, 0.15);
    [0.085, 0.17].forEach((delay, index) => {
      this.sweep(context, start + delay, 92 - index * 12, 45, 0.16, 0.065 - index * 0.012, "triangle");
      this.tone(context, start + delay, 420 + index * 110, 0.035, 0.009, "square");
    });
  }

  playClear(variant: ClearVariant): void {
    const context = this.getContext();
    if (!context) return;
    const start = context.currentTime + 0.1;
    if (variant === "wave") {
      this.clearRun(context, start, [392, 523.25, 659.25, 783.99], 0.075, 0.05);
      this.tone(context, start, 196, 0.28, 0.018, "triangle");
      return;
    }
    if (variant === "victory") {
      this.clearRun(context, start, [329.63, 440, 554.37, 659.25, 880], 0.068, 0.048);
      const finish = start + 0.34;
      [659.25, 880, 1046.5].forEach((frequency) => this.tone(context, finish, frequency, 0.19, 0.022, "triangle"));
      return;
    }
    this.sweep(context, start, 105, 210, 0.34, 0.026, "triangle");
    this.clearRun(context, start + 0.04, [261.63, 329.63, 392, 523.25, 659.25, 783.99], 0.056, 0.052);
    const finish = start + 0.39;
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      this.tone(context, finish + index * 0.005, frequency, 0.28, 0.027, "triangle");
      this.tone(context, finish + index * 0.005, frequency * 2, 0.12, 0.006, "square");
    });
  }

  private clearRun(context: AudioContext, start: number, notes: readonly number[], gap: number, volume: number): void {
    notes.forEach((frequency, index) => {
      const noteStart = start + index * gap;
      this.tone(context, noteStart, frequency, 0.11, volume, "triangle");
      this.tone(context, noteStart, frequency * 2, 0.065, 0.01, "square");
    });
  }

  private boom(context: AudioContext, start: number, volume: number): void {
    this.sweep(context, start, 130, 48, 0.24, volume, "triangle");
    this.tone(context, start + 0.028, 72, 0.11, volume * 0.35, "square");
  }

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext ?? (window as BrowserWindow).webkitAudioContext;
    if (!AudioContextClass) return null;
    this.context = new AudioContextClass();
    return this.context;
  }

  private tone(
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

  private sweep(
    context: AudioContext,
    start: number,
    from: number,
    to: number,
    duration: number,
    volume: number,
    type: OscillatorType
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }
}
