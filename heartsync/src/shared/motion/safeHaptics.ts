export type HapticTask = () => Promise<void>;

export function safelyRunHaptic(task: HapticTask) {
  void task().catch(() => undefined);
}

export function runHapticWithFallback(primary: HapticTask, fallback: HapticTask) {
  void primary().catch(fallback).catch(() => undefined);
}

