import { resolveNavigationMode } from '../navigationMode';

describe('resolveNavigationMode', () => {
  it.each([
    ['loading', false, 'loading'],
    ['setup_required', false, 'setup'],
    ['unauthenticated', false, 'auth'],
    ['authenticated', false, 'main'],
    ['authenticated', true, 'recovery'],
  ] as const)('maps %s/recovery=%s to %s', (status, recovery, expected) => {
    expect(resolveNavigationMode(status, recovery)).toBe(expected);
  });

  it('never exposes main routes without an authenticated status', () => {
    expect(resolveNavigationMode('unauthenticated', false)).not.toBe('main');
    expect(resolveNavigationMode('setup_required', false)).not.toBe('main');
  });
});
