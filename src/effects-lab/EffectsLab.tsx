import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BombIcon } from "../components/BombIcon";
import { EffectsLabAudio } from "./effects-lab-audio";
import {
  CLEAR_VARIANTS,
  EXPLOSION_VARIANTS,
  LIGHT_VARIANTS,
  OPEN_COUNTS,
  countedRevealPlan,
  labCellTimings,
  openingCellOrder,
  randomLabDemo,
  type ClearVariant,
  type ExplosionVariant,
  type LightVariant,
  type OpenCount
} from "./effects-lab-model";
import "./effects-lab.css";

const SIZE = 9;
const CELL_TIMINGS = labCellTimings(SIZE);
const OPEN_ORDER = openingCellOrder(SIZE);

const LIGHT_LABELS: Record<LightVariant, string> = {
  current: "現行・全面光",
  frame: "A・フレーム",
  scan: "B・斜めスキャン",
  cross: "C・ピクセル十字",
  double: "E・二重スクエア"
};

const EXPLOSION_LABELS: Record<ExplosionVariant, string> = {
  pixel: "A・PIXEL BURST（現行）",
  cinematic: "B・CINEMATIC BLAST",
  shockwave: "C・SHOCKWAVE"
};

const CLEAR_LABELS: Record<ClearVariant, string> = {
  wave: "A・CLEAR WAVE（現行）",
  victory: "B・VICTORY BOARD",
  super: "C・SUPER CLEAR"
};

type Demo =
  | { id: number; kind: "idle" }
  | { id: number; kind: "opening"; count: OpenCount; variant: LightVariant }
  | { id: number; kind: "explosion"; variant: ExplosionVariant }
  | { id: number; kind: "clear"; variant: ClearVariant };

type DemoInput =
  | { kind: "idle" }
  | { kind: "opening"; count: OpenCount; variant: LightVariant }
  | { kind: "explosion"; variant: ExplosionVariant }
  | { kind: "clear"; variant: ClearVariant };

function cssVars(values: Record<string, string | number>): CSSProperties {
  return values as CSSProperties;
}

function sampleNumber(index: number): number {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  return ((row * 2 + col * 3) % 4) + 1;
}

function sampleColor(index: number): number {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  return (row + col * 2) % 4;
}

function particles(count: number): Array<{ angle: number; distance: number; delay: number }> {
  return Array.from({ length: count }, (_, index) => ({
    angle: (360 / count) * index + (index % 2) * 9,
    distance: 56 + (index % 4) * 13,
    delay: (index % 3) * 12
  }));
}

export default function EffectsLab(): React.JSX.Element {
  const audioRef = useRef<EffectsLabAudio | null>(null);
  const timersRef = useRef<number[]>([]);
  const idRef = useRef(0);
  const [demo, setDemo] = useState<Demo>({ id: 0, kind: "idle" });
  const [openCount, setOpenCount] = useState<OpenCount>(5);
  const [lightVariant, setLightVariant] = useState<LightVariant>("frame");

  const audio = (): EffectsLabAudio => {
    audioRef.current ??= new EffectsLabAudio();
    audioRef.current.unlock();
    return audioRef.current;
  };

  const clearTimers = (): void => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => {
    document.documentElement.classList.remove("app-viewport-locked");
    document.body.classList.remove("app-viewport-locked");
    return () => {
      clearTimers();
      audioRef.current?.dispose();
    };
  }, []);

  const show = (next: DemoInput, clearQueued: boolean = true): void => {
    if (clearQueued) clearTimers();
    idRef.current += 1;
    setDemo({ ...next, id: idRef.current } as Demo);
    if (next.kind === "opening") audio().playCountedReveal(next.count);
    if (next.kind === "explosion") audio().playExplosion(next.variant);
    if (next.kind === "clear") audio().playClear(next.variant);
  };

  const playOpening = (): void => show({ kind: "opening", count: openCount, variant: lightVariant });
  const playExplosion = (variant: ExplosionVariant): void => show({ kind: "explosion", variant });
  const playClear = (variant: ClearVariant): void => show({ kind: "clear", variant });

  const playSequence = (kind: "light" | "explosion" | "clear"): void => {
    clearTimers();
    const items = kind === "light" ? LIGHT_VARIANTS : kind === "explosion" ? EXPLOSION_VARIANTS : CLEAR_VARIANTS;
    const gap = kind === "explosion" ? 1450 : kind === "clear" ? 1250 : 850;
    items.forEach((variant, index) => {
      const timer = window.setTimeout(() => {
        if (kind === "light") show({ kind: "opening", count: openCount, variant: variant as LightVariant }, false);
        if (kind === "explosion") show({ kind: "explosion", variant: variant as ExplosionVariant }, false);
        if (kind === "clear") show({ kind: "clear", variant: variant as ClearVariant }, false);
      }, index * gap);
      timersRef.current.push(timer);
    });
  };

  const playRandom = (): void => {
    const next = randomLabDemo();
    show(next);
  };

  const reset = (): void => {
    clearTimers();
    idRef.current += 1;
    setDemo({ id: idRef.current, kind: "idle" });
  };

  const status = demo.kind === "idle"
    ? "ボタンを押すと、音と演出を同時に再生します"
    : demo.kind === "opening"
      ? `${demo.count}マス / ${LIGHT_LABELS[demo.variant]}`
      : demo.kind === "explosion"
        ? EXPLOSION_LABELS[demo.variant]
        : CLEAR_LABELS[demo.variant];

  return (
    <main className="effects-lab">
      <div className="effects-lab-shell">
        <header className="lab-header">
          <div>
            <p className="lab-eyebrow">MULTICOLOR SWEEPER / COMPARISON MODE</p>
            <h1>EFFECT LAB</h1>
          </div>
          <a className="lab-back" href="/">GAMEへ戻る</a>
        </header>

        <section className="lab-preview" aria-live="polite">
          <div className="lab-preview-heading">
            <span>PREVIEW</span>
            <strong>{status}</strong>
          </div>
          <LabStage key={demo.id} demo={demo} />
          <p className="lab-note">比較専用ページです。ここで選んだ内容は通常ゲームに反映されません。</p>
        </section>

        <div className="lab-control-grid">
          <section className="lab-panel lab-panel-wide">
            <div className="lab-panel-title">
              <h2>OPEN / 開封</h2>
              <span>マス数連動サウンド + 光 5案</span>
            </div>
            <div className="lab-field">
              <span className="lab-field-label">開くマス数</span>
              <div className="lab-button-row lab-six">
                {OPEN_COUNTS.map((count) => (
                  <button
                    className={openCount === count ? "selected" : ""}
                    key={count}
                    onClick={() => setOpenCount(count)}
                    aria-pressed={openCount === count}
                    type="button"
                  >{count}</button>
                ))}
              </div>
            </div>
            <div className="lab-field">
              <span className="lab-field-label">光り方</span>
              <div className="lab-button-list">
                {LIGHT_VARIANTS.map((variant) => (
                  <button
                    className={lightVariant === variant ? "selected" : ""}
                    key={variant}
                    onClick={() => setLightVariant(variant)}
                    aria-pressed={lightVariant === variant}
                    type="button"
                  >{LIGHT_LABELS[variant]}</button>
                ))}
              </div>
            </div>
            <button className="lab-play lab-play-open" onClick={playOpening} type="button">
              ▶ OPENを再生
            </button>
            <OpenPlan count={openCount} />
          </section>

          <section className="lab-panel">
            <div className="lab-panel-title">
              <h2>EXPLOSION / 爆発</h2>
              <span>現行を残した強度違い</span>
            </div>
            <div className="lab-button-list">
              {EXPLOSION_VARIANTS.map((variant) => (
                <button key={variant} onClick={() => playExplosion(variant)} type="button">
                  ▶ {EXPLOSION_LABELS[variant]}
                </button>
              ))}
            </div>
          </section>

          <section className="lab-panel">
            <div className="lab-panel-title">
              <h2>CLEAR / クリア</h2>
              <span>盤面主役の豪華さ違い</span>
            </div>
            <div className="lab-button-list">
              {CLEAR_VARIANTS.map((variant) => (
                <button key={variant} onClick={() => playClear(variant)} type="button">
                  ▶ {CLEAR_LABELS[variant]}
                </button>
              ))}
            </div>
          </section>

          <section className="lab-panel lab-panel-wide lab-sequences">
            <div className="lab-panel-title">
              <h2>COMPARE / 連続比較</h2>
              <span>同条件で一気に見比べる</span>
            </div>
            <div className="lab-button-row lab-compare-buttons">
              <button onClick={() => playSequence("light")} type="button">光・全5案</button>
              <button onClick={() => playSequence("explosion")} type="button">爆発 A→C</button>
              <button onClick={() => playSequence("clear")} type="button">CLEAR A→C</button>
              <button className="random" onClick={playRandom} type="button">RANDOM</button>
              <button className="reset" onClick={reset} type="button">STOP / RESET</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function OpenPlan({ count }: { count: OpenCount }): React.JSX.Element {
  const plan = countedRevealPlan(count);
  const text = count <= 4
    ? `${count}マス = ${count}音をそのまま鳴らす`
    : `${count}マス = ${plan.pulseCount}連打 + 最後に${plan.finalLayers}音を重ねる（${plan.durationMs}ms以内）`;
  return <p className="lab-plan">SOUND: {text}</p>;
}

function LabStage({ demo }: { demo: Demo }): React.JSX.Element {
  const openSet = useMemo(() => {
    if (demo.kind !== "opening") return new Set<number>();
    return new Set(OPEN_ORDER.slice(0, demo.count));
  }, [demo]);

  const orderMap = useMemo(() => new Map(OPEN_ORDER.map((index, order) => [index, order])), []);
  const stageClass = `lab-stage lab-stage-${demo.kind}${demo.kind === "explosion" ? ` lab-explosion-${demo.variant}` : ""}${demo.kind === "clear" ? ` lab-clear-${demo.variant}` : ""}`;

  return (
    <div className={stageClass}>
      <div className="lab-board-wrap">
        <div className="lab-board" role="img" aria-label="エフェクト確認用9×9盤面">
          {CELL_TIMINGS.map((timing) => {
            const isOpening = demo.kind === "opening" && openSet.has(timing.index);
            const isExplosion = demo.kind === "explosion";
            const isClear = demo.kind === "clear";
            const openOrder = orderMap.get(timing.index) ?? 0;
            const openDelay = demo.kind === "opening"
              ? demo.count <= 4
                ? openOrder * countedRevealPlan(demo.count).intervalMs
                : timing.openDelayMs + (openOrder % 4) * 3
              : 0;
            const classes = [
              "lab-cell",
              isOpening ? `lab-cell-opening lab-light-${demo.variant}` : "",
              isExplosion ? `lab-cell-explosion lab-cell-explosion-${demo.variant}` : "",
              isClear ? `lab-cell-clear lab-cell-clear-${demo.variant}` : "",
              (isOpening || isExplosion || isClear) ? "lab-cell-revealed" : ""
            ].filter(Boolean).join(" ");
            const x = timing.col - 4;
            const y = timing.row - 4;
            return (
              <div
                className={classes}
                key={timing.index}
                style={cssVars({
                  "--open-delay": `${openDelay}ms`,
                  "--distance": timing.distance,
                  "--diagonal-delay": `${timing.diagonalDelayMs}ms`,
                  "--opposing-delay": `${timing.opposingDelayMs}ms`,
                  "--shock-delay": `${timing.distance * 34}ms`,
                  "--radial-clear-delay": `${timing.distance * 32}ms`,
                  "--blast-x": `${x * 24}px`,
                  "--blast-y": `${y * 24}px`,
                  "--blast-x-soft": `${x * 1.92}px`,
                  "--blast-y-soft": `${y * 1.92}px`,
                  "--blast-x-return": `${x * -0.6}px`,
                  "--blast-y-return": `${y * -0.6}px`,
                  "--blast-rotate": `${(x * 17 + y * 11) % 55}deg`,
                  "--cell-color": `var(--lab-color-${sampleColor(timing.index)})`
                })}
              >
                {(isOpening || isClear || isExplosion) && <span>{sampleNumber(timing.index)}</span>}
                {isExplosion && timing.index === 40 && (
                  <span className="lab-bomb"><BombIcon color={0} language="ja" /></span>
                )}
              </div>
            );
          })}
        </div>
        {demo.kind === "explosion" && <ExplosionOverlay variant={demo.variant} />}
        {demo.kind === "clear" && <ClearOverlay variant={demo.variant} />}
        {demo.kind === "idle" && <div className="lab-idle-message">SELECT &amp; PLAY</div>}
      </div>
      {demo.kind === "explosion" && demo.variant === "cinematic" && <div className="lab-cinematic-flash" />}
    </div>
  );
}

function ExplosionOverlay({ variant }: { variant: ExplosionVariant }): React.JSX.Element {
  const particleCount = variant === "pixel" ? 14 : variant === "cinematic" ? 28 : 18;
  return (
    <div className={`lab-explosion-overlay lab-explosion-overlay-${variant}`} aria-hidden="true">
      <span className="lab-explosion-core" />
      <span className="lab-explosion-ring lab-ring-one" />
      {variant !== "pixel" && <span className="lab-explosion-ring lab-ring-two" />}
      {particles(particleCount).map((particle, index) => (
        <i
          className="lab-particle"
          key={index}
          style={cssVars({
            "--angle": `${particle.angle}deg`,
            "--particle-distance": `${particle.distance}px`,
            "--particle-delay": `${particle.delay}ms`,
            "--particle-color": index % 3 === 0 ? "#fff2a8" : index % 3 === 1 ? "#f1c85d" : "#ff6677"
          })}
        />
      ))}
    </div>
  );
}

function ClearOverlay({ variant }: { variant: ClearVariant }): React.JSX.Element {
  return (
    <div className={`lab-clear-overlay lab-clear-overlay-${variant}`} aria-hidden="true">
      <span className="lab-clear-border" />
      {variant !== "wave" && Array.from({ length: variant === "super" ? 16 : 8 }, (_, index) => (
        <i key={index} style={cssVars({
          "--spark-angle": `${index * (variant === "super" ? 22.5 : 45)}deg`,
          "--spark-delay": `${300 + index * 10}ms`,
          "--spark-color": `var(--lab-color-${index % 4})`
        })} />
      ))}
      {variant === "super" && <span className="lab-clear-rays" />}
      <strong>CLEAR!</strong>
    </div>
  );
}
