/**
 * Shared AudioContext recovery for returning from the background.
 *
 * iOS Safari moves an AudioContext into the non-standard "interrupted" state when the
 * user switches apps or closes the browser without quitting it. Resuming only from
 * "suspended" leaves that context stuck, so every non-running state is treated as
 * recoverable here.
 */

/** How long to watch the clock before calling a resumed context unrecoverable. */
const LIVENESS_PROBE_MS = 250;

/** Resolves true once the context is running. Closed or refused resumes give false. */
export async function resumeContext(context: AudioContext): Promise<boolean> {
  if (isClosed(context)) return false;
  if (!isRunning(context)) {
    try {
      await context.resume();
    } catch {
      return false;
    }
  }
  return isRunning(context);
}

/**
 * Detects a context that claims to be running but produces no sound.
 * After an interruption iOS can restore the state while the clock stays frozen.
 * A still suspended/interrupted context returns false: the next user gesture may revive it.
 */
export async function isContextDead(context: AudioContext): Promise<boolean> {
  if (isClosed(context)) return true;
  if (!isRunning(context)) return false;

  const before = context.currentTime;
  await wait(LIVENESS_PROBE_MS);
  if (isClosed(context)) return true;
  return isRunning(context) && context.currentTime <= before;
}

/** Release a dead context before building a new one; iOS caps how many can coexist. */
export function discardContext(context: AudioContext | null): void {
  if (!context || isClosed(context)) return;
  void context.close().catch(() => {});
}

function isRunning(context: AudioContext): boolean {
  return context.state === "running";
}

function isClosed(context: AudioContext): boolean {
  return context.state === "closed";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
