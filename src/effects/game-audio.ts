import { EFFECT_TIMING, revealFeedbackForCount } from "./game-effects";

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
    const feedback = revealFeedbackForCount(revealedCount);
    const layers = [...new Set(delaysMs)].sort((left, right) => left - right).slice(0, 13);
    const pitchMultiplier = 2 ** (feedback.pitchShiftSemitones / 12);
    layers.forEach((delayMs, index) => {
      const frequency = Math.min(280 * pitchMultiplier * 2 ** (index * 1.35 / 12), 620);
      const noteStart = context.currentTime + delayMs / 1000;
      this.playTone(context, noteStart, frequency, 0.052, 0.034, "triangle");
      this.playTone(context, noteStart, frequency * 2, 0.03, 0.01, "square");
    });

    const start = context.currentTime;
    if (feedback.addBody) {
      this.playTone(context, start, 150 * pitchMultiplier, 0.09, 0.014, "triangle");
    }

    const lastDelayMs = layers.at(-1) ?? 0;
    const accentStart = start + lastDelayMs / 1000 + 0.075;
    if (feedback.accentNotes >= 1) {
      this.playTone(context, accentStart, 659.25 * pitchMultiplier, 0.075, 0.026, "triangle");
      this.playTone(context, accentStart, 1318.5 * pitchMultiplier, 0.04, 0.008, "square");
    }
    if (feedback.accentNotes === 2) {
      this.playTone(context, accentStart + 0.07, 783.99 * pitchMultiplier, 0.09, 0.028, "triangle");
      this.playTone(context, accentStart + 0.07, 1567.98 * pitchMultiplier, 0.045, 0.008, "square");
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
    this.playTone(context, start + 0.028, 78, 0.09, 0.034, "square");
    this.playTone(context, start + 0.006, 510, 0.035, 0.012, "square");
  }

  playClear(delayMs: number = EFFECT_TIMING.clearJingleDelayMs): void {
    const context = this.getContext();
    if (!context) return;
    const start = context.currentTime + delayMs / 1000;
    this.playTone(context, start, 196, 0.28, 0.018, "triangle");
    [392, 523.25, 659.25, 783.99].forEach((frequency, index) => {
      const noteStart = start + index * 0.075;
      this.playTone(context, noteStart, frequency, 0.11, 0.05, "triangle");
      this.playTone(context, noteStart, frequency * 2, 0.07, 0.012, "square");
    });
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
}
