import { runHapticWithFallback, safelyRunHaptic } from '../safeHaptics';

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('safe haptic execution', () => {
  it('runs a fallback when a semantic haptic is unsupported', async () => {
    const primary = jest.fn().mockRejectedValue(new Error('unsupported'));
    const fallback = jest.fn().mockResolvedValue(undefined);
    runHapticWithFallback(primary, fallback);
    await flushPromises();
    expect(primary).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('swallows rejected primary and fallback tasks', async () => {
    const primary = jest.fn().mockRejectedValue(new Error('unsupported'));
    const fallback = jest.fn().mockRejectedValue(new Error('no vibrator'));
    runHapticWithFallback(primary, fallback);
    safelyRunHaptic(fallback);
    await expect(flushPromises()).resolves.toBeUndefined();
  });
});

