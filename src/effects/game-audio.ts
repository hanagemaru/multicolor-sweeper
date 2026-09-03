import {
  EFFECT_TIMING,
  countedRevealPlan,
  type ClearEffectVariant,
  type ExplosionEffectVariant
} from "./game-effects";

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

  playReveal(delaysMs: readonly number[], revealedCount: number = delaysMs.length): void {
    const context = this.getContext();
    if (!context || delaysMs.length === 0) return;
    const plan = countedRevealPlan(revealedCount);
    const start = context.currentTime;
    const pitchMultiplier = 2 ** (plan.pitchShiftSemitones / 12);

    for (let index = 0; index < plan.pulseCount; index += 1) {
      const frequency = Math.min(270 * pitchMultiplier * 2 ** (index * 1.2 / 12), 560);
      const noteStart = start + index * plan.intervalMs / 1000;
      this.playTone(context, noteStart, frequency, 0.052, 0.031, "triangle");
      this.playTone(context, noteStart, frequency * 2, 0.03, 0.009, "square");
    }

    if (plan.finalLayers > 0) {
      const finish = start + Math.max(0.09, (plan.pulseCount - 1) * plan.intervalMs / 1000 + 0.05);
      const frequencies = plan.finalLayers === 2 ? [659.25, 783.99] : [523.25, 659.25, 783.99];
      frequencies.forEach((frequency, index) => {
        this.playTone(context, finish + index * 0.012, frequency * pitchMultiplier, 0.085, 0.022, "triangle");
        this.playTone(context, finish + index * 0.012, frequency * 2 * pitchMultiplier, 0.045, 0.006, "square");
      });
      this.playTone(context, start, 145 * pitchMultiplier, 0.1, 0.011, "triangle");
    }
  }

  playFlag(action: "place" | "remove"): void {
    const context = this.getContext();
    if (!context) return;
    const start = context.currentTime;
    if (action === "place") {
      this.playTone(context, start, 230, 0.045, 0.025, "square");
      this.playTone(context, start + 0.006, 460, 0.032, 0.012, "triangle");
      return;
    }
    this.playTone(context, start, 390, 0.032, 0.017, "square");
    this.playTone(context, start + 0.01, 520, 0.028, 0.01, "triangle");
  }

  playExplosion(variant: ExplosionEffectVariant = "pixel"): void {
    const context = this.getContext();
    if (!context) return;
    const start = context.currentTime;
    if (variant === "cinematic") {
      this.playSweep(context, start, 980, 1950, 0.2, 0.026, "sine");
      this.playTone(context, start + 0.16, 2350, 0.055, 0.012, "sine");
      this.playBoom(context, start + 0.22, 0.19);
      this.playSweep(context, start + 0.22, 98, 34, 0.42, 0.16, "triangle");
      this.playTone(context, start + 0.23, 46, 0.38, 0.07, "square");
      this.playTone(context, start + 0.225, 620, 0.055, 0.018, "square");
      return;
    }
    if (variant === "shockwave") {
      this.playBoom(context, start, 0.15);
      [0.085, 0.17].forEach((delay, index) => {
        this.playSweep(context, start + delay, 92 - index * 12, 45, 0.16, 0.065 - index * 0.012, "triangle");
        this.playTone(context, start + delay, 420 + index * 110, 0.035, 0.009, "square");
      });
      return;
    }
    this.playBoom(context, start, 0.12);
    this.playTone(context, start + 0.006, 510, 0.035, 0.012, "square");
  }

  playClear(variant: ClearEffectVariant = "wave", delayMs?: number): void {
    const context = this.getContext();
    if (!context) return;
    const defaultDelayMs = variant === "wave" ? EFFECT_TIMING.clearJingleDelayMs : 100;
    const start = context.currentTime + (delayMs ?? defaultDelayMs) / 1000;
    if (variant === "victory") {
      this.playClearRun(context, start, [329.63, 440, 554.37, 659.25, 880], 0.068, 0.048);
      const finish = start + 0.34;
      [659.25, 880, 1046.5].forEach((frequency) => {
        this.playTone(context, finish, frequency, 0.19, 0.022, "triangle");
      });
      return;
    }
    if (variant === "super") {
      this.playSweep(context, start, 105, 210, 0.34, 0.026, "triangle");
      this.playClearRun(context, start + 0.04, [261.63, 329.63, 392, 523.25, 659.25, 783.99], 0.056, 0.052);
      const finish = start + 0.39;
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        this.playTone(context, finish + index * 0.005, frequency, 0.28, 0.027, "triangle");
        this.playTone(context, finish + index * 0.005, frequency * 2, 0.12, 0.006, "square");
      });
      return;
    }
    this.playTone(context, start, 196, 0.28, 0.018, "triangle");
    this.playClearRun(context, start, [392, 523.25, 659.25, 783.99], 0.075, 0.05);
    const finish = start + 0.27;
    this.playTone(context, finish, 1046.5, 0.12, 0.022, "triangle");
    this.playTone(context, finish, 1567.98, 0.09, 0.012, "square");
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

  private playClearRun(
    context: AudioContext,
    start: number,
    notes: readonly number[],
    gap: number,
    volume: number
  ): void {
    notes.forEach((frequency, index) => {
      const noteStart = start + index * gap;
      this.playTone(context, noteStart, frequency, 0.11, volume, "triangle");
      this.playTone(context, noteStart, frequency * 2, 0.065, 0.01, "square");
    });
  }

  private playBoom(context: AudioContext, start: number, volume: number): void {
    this.playSweep(context, start, 130, 48, 0.24, volume, "triangle");
    this.playTone(context, start + 0.028, 72, 0.11, volume * 0.35, "square");
  }

  private playSweep(
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
