type BgmTrack = "title" | "game" | "result";
type BgmTimbre = "sine" | "organ" | "triangle";

const BGM_FILTER_HZ = 4200;
const BGM_BUS_GAIN = 0.82;
const BGM_FADE_IN_MS = 140;
const BGM_FADE_OUT_MS = 70;
const LOOP_LOOKAHEAD_SECONDS = 0.35;

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function trackBpm(track: BgmTrack): number {
  if (track === "title") return 113;
  if (track === "game") return 117;
  return 101;
}

export class GameBgm {
  private context: AudioContext | null = null;
  private desiredTrack: BgmTrack | null = null;
  private currentTrack: BgmTrack | null = null;
  private trackGain: GainNode | null = null;
  private loopTimer: number | null = null;
  private nextLoopStart = 0;
  private generation = 0;
  private sources = new Set<OscillatorNode>();
  private observer: MutationObserver | null = null;
  private outcomeHold = false;

  constructor() {
    if (typeof document !== "undefined" && typeof MutationObserver !== "undefined" && document.body) {
      this.observer = new MutationObserver(() => this.syncFromDom());
      this.observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"]
      });
      this.syncFromDom();
    }
  }

  onUnlock(context: AudioContext): void {
    this.context = context;
    this.syncFromDom();
    if (context.state === "running" && this.desiredTrack && this.currentTrack !== this.desiredTrack) {
      this.startTrack(context, this.desiredTrack);
    }
  }

  onExplosion(): void {
    this.outcomeHold = true;
    this.desiredTrack = null;
    this.stopCurrent(BGM_FADE_OUT_MS);
  }

  onClear(): void {
    this.outcomeHold = true;
    const context = this.context;
    const gain = this.trackGain;
    if (!context || !gain) return;
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.linearRampToValueAtTime(BGM_BUS_GAIN * 0.24, now + 0.18);
  }

  dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.desiredTrack = null;
    this.stopCurrent(0);
    this.context = null;
  }

  private syncFromDom(): void {
    if (typeof document === "undefined") return;

    if (document.querySelector(".app-shell-settings, .app-shell-settings-page")) {
      this.outcomeHold = false;
      this.setTrack("title");
      return;
    }

    if (document.querySelector(".hud-action-pending")) return;

    if (document.querySelector(".result-dialog, .hud-action-result")) {
      this.outcomeHold = false;
      this.setTrack("result");
      return;
    }

    if (document.querySelector(".app-shell-gameplay") && !this.outcomeHold) {
      this.setTrack("game");
    }
  }

  private setTrack(track: BgmTrack): void {
    this.desiredTrack = track;
    if (this.currentTrack === track) return;
    const context = this.context;
    if (!context || context.state !== "running") return;
    this.startTrack(context, track);
  }

  private startTrack(context: AudioContext, track: BgmTrack): void {
    this.stopCurrent(BGM_FADE_OUT_MS);
    this.currentTrack = track;
    this.desiredTrack = track;
    const generation = ++this.generation;

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(BGM_FILTER_HZ, context.currentTime);
    filter.Q.setValueAtTime(0.7, context.currentTime);

    const trackGain = context.createGain();
    trackGain.gain.setValueAtTime(0.0001, context.currentTime);
    trackGain.gain.linearRampToValueAtTime(BGM_BUS_GAIN, context.currentTime + BGM_FADE_IN_MS / 1000);
    filter.connect(trackGain).connect(context.destination);
    this.trackGain = trackGain;

    const start = context.currentTime + 0.035;
    this.schedulePhrase(context, track, start, filter);
    this.nextLoopStart = start + this.loopDuration(track);
    this.armNextLoop(context, track, filter, generation);
  }

  private stopCurrent(fadeMs: number): void {
    if (this.loopTimer !== null && typeof window !== "undefined") {
      window.clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    this.generation += 1;

    const context = this.context;
    const gain = this.trackGain;
    const stopAt = context ? context.currentTime + fadeMs / 1000 : 0;
    if (context && gain) {
      const now = context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.linearRampToValueAtTime(0.0001, stopAt);
    }

    for (const source of this.sources) {
      try {
        if (context) source.stop(stopAt + 0.03);
        else source.stop();
      } catch {
        // Already stopped or never started; safe to ignore during a track change.
      }
    }
    this.sources.clear();
    this.trackGain = null;
    this.currentTrack = null;
  }

  private armNextLoop(
    context: AudioContext,
    track: BgmTrack,
    destination: AudioNode,
    generation: number
  ): void {
    if (typeof window === "undefined") return;
    const delayMs = Math.max(
      20,
      (this.nextLoopStart - context.currentTime - LOOP_LOOKAHEAD_SECONDS) * 1000
    );
    this.loopTimer = window.setTimeout(() => {
      if (generation !== this.generation || this.currentTrack !== track) return;
      const start = Math.max(this.nextLoopStart, context.currentTime + 0.03);
      this.schedulePhrase(context, track, start, destination);
      this.nextLoopStart = start + this.loopDuration(track);
      this.armNextLoop(context, track, destination, generation);
    }, delayMs);
  }

  private loopDuration(track: BgmTrack): number {
    return 4 * 4 * (60 / trackBpm(track));
  }

  private schedulePhrase(context: AudioContext, track: BgmTrack, start: number, destination: AudioNode): void {
    if (track === "title") {
      this.scheduleTitle(context, start, destination);
      return;
    }
    if (track === "game") {
      this.scheduleGame(context, start, destination);
      return;
    }
    this.scheduleResult(context, start, destination);
  }

  private scheduleTitle(context: AudioContext, start: number, destination: AudioNode): void {
    const beat = 60 / trackBpm("title");
    const roots = [48, 45, 53, 43] as const;
    const motifs = [
      [60, 64, null, 67, 64, null, 62, 64],
      [57, 60, null, 64, 60, null, 59, 60],
      [65, 69, null, 72, 69, null, 67, 69],
      [55, 59, null, 62, 59, null, 57, 59]
    ] as const;

    roots.forEach((root, bar) => {
      const base = start + bar * 4 * beat;
      this.playBgmNote(context, destination, base, 0.34, root, 0.026, "organ", 0.014, 0.075);
      this.playBgmNote(context, destination, base + 2 * beat, 0.28, root + 7, 0.02, "sine");
      motifs[bar].forEach((note, index) => {
        if (note === null) return;
        this.playBgmNote(context, destination, base + index * beat / 2, 0.14, note, 0.013, "organ", 0.006, 0.045);
      });
    });
  }

  private scheduleGame(context: AudioContext, start: number, destination: AudioNode): void {
    const beat = 60 / trackBpm("game");
    const roots = [48, 45, 53, 43] as const;
    const patterns = [
      [60, 64, null, 67, 64, 67, null, 64],
      [57, 60, null, 64, 60, 64, null, 60],
      [65, 69, null, 72, 69, 72, null, 69],
      [55, 59, null, 62, 59, 62, null, 59]
    ] as const;

    roots.forEach((root, bar) => {
      const base = start + bar * 4 * beat;
      this.playKick(context, destination, base, 0.017);
      this.playKick(context, destination, base + 2 * beat, 0.013);
      [0, 1.5, 2.5, 3.5].forEach((offset) => {
        const note = root + (offset === 1.5 || offset === 3.5 ? 7 : 0);
        this.playBgmNote(context, destination, base + offset * beat, 0.18, note, 0.025, "sine");
      });
      patterns[bar].forEach((note, index) => {
        if (note === null) return;
        this.playBgmNote(context, destination, base + index * beat / 2, 0.12, note, 0.011, "organ", 0.006, 0.04);
      });
    });

    [
      [1, 67], [4.5, 69], [8, 67], [11.5, 72], [15, 69]
    ].forEach(([offset, note]) => {
      this.playBgmNote(context, destination, start + offset * beat, 0.24, note, 0.016, "sine", 0.015, 0.09);
    });
  }

  private scheduleResult(context: AudioContext, start: number, destination: AudioNode): void {
    const beat = 60 / trackBpm("result");
    const roots = [48, 53, 43, 48] as const;

    this.playBgmNote(context, destination, start, 0.18, 60, 0.018, "triangle");
    this.playBgmNote(context, destination, start + 0.16, 0.22, 64, 0.018, "triangle");
    this.playBgmNote(context, destination, start + 0.36, 0.34, 67, 0.017, "triangle");

    roots.forEach((root, bar) => {
      const base = start + 0.9 + bar * 4 * beat;
      this.playBgmNote(context, destination, base, 1.1, root, 0.023, "organ", 0.014, 0.08);
      this.playBgmNote(context, destination, base + 0.2, 0.75, root + 7, 0.014, "sine");
      this.playBgmNote(context, destination, base + beat, 0.16, root + 12, 0.009, "triangle");
      this.playBgmNote(context, destination, base + 3 * beat, 0.16, root + 14, 0.009, "triangle");
    });
  }

  private playBgmNote(
    context: AudioContext,
    destination: AudioNode,
    start: number,
    duration: number,
    midi: number,
    volume: number,
    timbre: BgmTimbre,
    attack = 0.008,
    release = 0.06
  ): void {
    const frequency = midiToFrequency(midi);
    const harmonics = timbre === "organ"
      ? [[1, 0.68], [2, 0.24], [3, 0.12], [4, 0.05]] as const
      : [[1, 1]] as const;
    const oscillatorType: OscillatorType = timbre === "triangle" ? "triangle" : "sine";

    harmonics.forEach(([multiple, weight]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = oscillatorType;
      oscillator.frequency.setValueAtTime(frequency * multiple, start);
      const peak = Math.max(volume * weight, 0.0002);
      const sustain = Math.max(peak * 0.66, 0.0001);
      const releaseStart = Math.max(start + attack + 0.01, start + duration - release);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + attack);
      gain.gain.exponentialRampToValueAtTime(sustain, Math.min(releaseStart, start + attack + 0.04));
      gain.gain.setValueAtTime(sustain, releaseStart);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
      this.trackSource(oscillator);
    });
  }

  private playKick(context: AudioContext, destination: AudioNode, start: number, volume: number): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(88, start);
    oscillator.frequency.exponentialRampToValueAtTime(45, start + 0.13);
    gain.gain.setValueAtTime(Math.max(volume, 0.0002), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
    oscillator.connect(gain).connect(destination);
    oscillator.start(start);
    oscillator.stop(start + 0.15);
    this.trackSource(oscillator);
  }

  private trackSource(source: OscillatorNode): void {
    this.sources.add(source);
    source.addEventListener("ended", () => this.sources.delete(source), { once: true });
  }
}
