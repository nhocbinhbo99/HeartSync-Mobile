import type { AuthStatus } from '../features/auth/AuthProvider';

export type NavigationMode = 'loading' | 'setup' | 'auth' | 'recovery' | 'main';

export function resolveNavigationMode(status: AuthStatus, recoveryPending: boolean): NavigationMode {
  if (status === 'loading') return 'loading';
  if (status === 'setup_required') return 'setup';
  if (recoveryPending) return 'recovery';
  if (status === 'authenticated') return 'main';
  return 'auth';
}
