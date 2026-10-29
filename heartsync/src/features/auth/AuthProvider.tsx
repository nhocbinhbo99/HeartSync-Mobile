import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../services/supabase';
import { supabaseConfig } from '../../services/supabaseConfig';
import { AUTH_CALLBACK_URL, PASSWORD_RECOVERY_URL, extractAuthCallback } from './deepLink';
import { toSafeAuthMessage } from './authError';

export type AuthStatus = 'loading' | 'setup_required' | 'unauthenticated' | 'authenticated';
export type AuthActionResult = { ok: true; notice?: string } | { ok: false; message: string };

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  recoveryPending: boolean;
  setupMessage?: string;
  bootstrapError?: string;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = PropsWithChildren<{ client?: SupabaseClient | null }>;

export function AuthProvider({ children, client = getSupabaseClient() }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>(client ? 'loading' : 'setup_required');
  const [session, setSession] = useState<Session | null>(null);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string>();

  useEffect(() => {
    if (!client) return;
    let mounted = true;
    void client.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setBootstrapError(toSafeAuthMessage(error));
      setSession(data.session);
      setStatus(data.session ? 'authenticated' : 'unauthenticated');
    }).catch(() => {
      if (!mounted) return;
      setBootstrapError('Không thể đọc phiên đã lưu. Vui lòng thử lại.');
      setStatus('unauthenticated');
    });

    const { data: authListener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'unauthenticated');
      if (event === 'PASSWORD_RECOVERY') setRecoveryPending(true);
      if (event === 'SIGNED_OUT') setRecoveryPending(false);
    });

    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const callback = extractAuthCallback(url);
      if (!callback) return;
      try {
        const { data, error } = await client.auth.exchangeCodeForSession(callback.code);
        if (!mounted) return;
        if (error) {
          setBootstrapError(toSafeAuthMessage(error));
          return;
        }
        setSession(data.session);
        setStatus('authenticated');
        setRecoveryPending(callback.purpose === 'recovery');
      } catch {
        if (mounted) setBootstrapError('Không thể xác minh liên kết đăng nhập. Vui lòng thử lại.');
      }
    };

    void Linking.getInitialURL().then(handleUrl).catch(() => {
      if (mounted) setBootstrapError('Không thể đọc liên kết mở ứng dụng.');
    });
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => void handleUrl(url));

    const refreshForState = (nextState: string) => {
      if (nextState === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    refreshForState(AppState.currentState ?? 'unknown');
    const appStateSubscription = AppState.addEventListener('change', refreshForState);

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      linkingSubscription.remove();
      appStateSubscription.remove();
      client.auth.stopAutoRefresh();
    };
  }, [client]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, message: toSafeAuthMessage(error) } : { ok: true };
  }, [client]);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: AUTH_CALLBACK_URL },
    });
    if (error) return { ok: false, message: toSafeAuthMessage(error) };
    return { ok: true, notice: data.session ? undefined : 'Kiểm tra email để xác nhận tài khoản trước khi đăng nhập.' };
  }, [client]);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: PASSWORD_RECOVERY_URL });
    if (error) return { ok: false, message: toSafeAuthMessage(error) };
    return { ok: true, notice: 'Nếu email tồn tại, bạn sẽ nhận được liên kết khôi phục.' };
  }, [client]);

  const updatePassword = useCallback(async (password: string): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    const { error } = await client.auth.updateUser({ password });
    if (error) return { ok: false, message: toSafeAuthMessage(error) };
    setRecoveryPending(false);
    return { ok: true, notice: 'Mật khẩu đã được cập nhật.' };
  }, [client]);

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    const { error } = await client.auth.signOut();
    return error ? { ok: false, message: toSafeAuthMessage(error) } : { ok: true };
  }, [client]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    session,
    user: session?.user ?? null,
    recoveryPending,
    setupMessage: supabaseConfig.configured ? undefined : supabaseConfig.reason,
    bootstrapError,
    signIn,
    signUp,
    requestPasswordReset,
    updatePassword,
    signOut,
  }), [bootstrapError, recoveryPending, requestPasswordReset, session, signIn, signOut, signUp, status, updatePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
