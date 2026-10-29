import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';

import { AuthProvider, useAuth } from '../AuthProvider';

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(async () => null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('../../../services/supabase', () => ({ getSupabaseClient: jest.fn(() => null) }));
jest.mock('../../../services/supabaseConfig', () => ({
  supabaseConfig: { configured: false, reason: 'Thiếu cấu hình test.' },
}));

function createMockClient() {
  let listener: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;
  const unsubscribe = jest.fn();
  const auth = {
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    onAuthStateChange: jest.fn((callback: typeof listener) => {
      listener = callback;
      return { data: { subscription: { unsubscribe } } };
    }),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
    exchangeCodeForSession: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
    signOut: jest.fn(),
  };
  return {
    client: { auth } as unknown as SupabaseClient,
    auth,
    emit: (event: AuthChangeEvent, session: Session | null) => listener?.(event, session),
    unsubscribe,
  };
}

describe('AuthProvider', () => {
  it('exposes setup_required without creating a client', async () => {
    const wrapper = ({ children }: PropsWithChildren) => <AuthProvider client={null}>{children}</AuthProvider>;
    const { result } = await renderHook(() => useAuth(), { wrapper });
    expect(result.current.status).toBe('setup_required');
  });

  it('loads a session, handles auth transitions, sanitizes errors, and unsubscribes', async () => {
    const mock = createMockClient();
    mock.auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { status: 400, message: 'Invalid login credentials' } });
    const wrapper = ({ children }: PropsWithChildren) => <AuthProvider client={mock.client}>{children}</AuthProvider>;
    const { result, unmount } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));
    const fakeSession = {
      access_token: 'test-access-token', refresh_token: 'test-refresh-token', expires_in: 3600,
      expires_at: 4102444800, token_type: 'bearer', user: { id: 'user-1', email: 'person@example.com' },
    } as Session;
    await act(() => mock.emit('SIGNED_IN', fakeSession));
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.user?.id).toBe('user-1');

    await act(async () => {
      const action = await result.current.signIn('person@example.com', 'bad-password');
      expect(action).toEqual({ ok: false, message: 'Email hoặc mật khẩu không đúng.' });
    });

    await unmount();
    expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mock.auth.stopAutoRefresh).toHaveBeenCalled();
  });
});
