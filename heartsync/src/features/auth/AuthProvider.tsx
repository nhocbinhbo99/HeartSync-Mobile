import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { clearAllAppCaches } from '../../services/photoCache';
import { getSupabaseClient, type AppSupabaseClient } from '../../services/supabase';
import { supabaseConfig } from '../../services/supabaseConfig';
import { AUTH_CALLBACK_URL, PASSWORD_RECOVERY_URL, extractAuthCallback } from './deepLink';
import { toSafeAuthMessage } from './authError';
import type { SignUpInput } from '../../services/contracts';

export type AuthStatus = 'loading' | 'setup_required' | 'unauthenticated' | 'profile_required' | 'authenticated';
export type AuthActionResult = { ok: true; notice?: string } | { ok: false; message: string };

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  recoveryPending: boolean;
  setupMessage?: string;
  bootstrapError?: string;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (input: SignUpInput) => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  completeOnboarding: () => Promise<AuthActionResult>;
  refreshProfileStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = PropsWithChildren<{ client?: AppSupabaseClient | null }>;

export function AuthProvider({ children, client = getSupabaseClient() }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>(client ? 'loading' : 'setup_required');
  const [session, setSession] = useState<Session | null>(null);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string>();
  const resolvedUserRef = useRef<{ userId: string | null; status: AuthStatus }>({ userId: null, status: 'loading' });

  const resolveProfileStatus = useCallback(async (activeSession: Session | null, force = false) => {
    const nextUserId = activeSession?.user?.id ?? null;
    if (resolvedUserRef.current.userId && resolvedUserRef.current.userId !== nextUserId) {
      clearAllAppCaches();
    }
    setSession(activeSession);
    if (!client || !activeSession) {
      const nextStatus: AuthStatus = client ? 'unauthenticated' : 'setup_required';
      resolvedUserRef.current = { userId: null, status: nextStatus };
      setStatus(nextStatus);
      return;
    }
    if (!force && resolvedUserRef.current.userId === nextUserId && resolvedUserRef.current.status === 'authenticated') {
      return;
    }
    const { data, error } = await client.from('profiles').select('profile_completed_at')
      .eq('id', activeSession.user.id).maybeSingle();
    if (error) {
      setBootstrapError('Không thể kiểm tra trạng thái hồ sơ. Vui lòng thử lại.');
      resolvedUserRef.current = { userId: nextUserId, status: 'profile_required' };
      setStatus('profile_required');
      return;
    }
    setBootstrapError(undefined);
    const nextStatus: AuthStatus = data?.profile_completed_at ? 'authenticated' : 'profile_required';
    resolvedUserRef.current = { userId: nextUserId, status: nextStatus };
    setStatus(nextStatus);
  }, [client]);

  useEffect(() => {
    if (!client) return;
    let mounted = true;
    let initialResolved = false;

    void client.auth.getSession().then(({ data, error }) => {
      if (!mounted || initialResolved) return;
      initialResolved = true;
      if (error) setBootstrapError(toSafeAuthMessage(error));
      void resolveProfileStatus(data.session);
    }).catch(() => {
      if (!mounted) return;
      setBootstrapError('Không thể đọc phiên đã lưu. Vui lòng thử lại.');
      setStatus('unauthenticated');
    });

    const { data: authListener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') {
        if (initialResolved) return;
        initialResolved = true;
      }
      if (event === 'SIGNED_OUT') {
        clearAllAppCaches();
        setRecoveryPending(false);
      }
      if (event === 'PASSWORD_RECOVERY') setRecoveryPending(true);
      void resolveProfileStatus(nextSession, event === 'SIGNED_IN' || event === 'USER_UPDATED');
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
        await resolveProfileStatus(data.session);
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
  }, [client, resolveProfileStatus]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, message: toSafeAuthMessage(error) } : { ok: true };
  }, [client]);

  const signUp = useCallback(async (input: SignUpInput): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    const { data, error } = await client.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        emailRedirectTo: AUTH_CALLBACK_URL,
        data: {
          onboarding_display_name: input.displayName.trim(),
          onboarding_date_of_birth: input.dateOfBirth,
          onboarding_gender: input.gender,
        },
      },
    });
    if (error) return { ok: false, message: toSafeAuthMessage(error) };
    return { ok: true, notice: data.session ? undefined : 'Kiểm tra email để xác nhận tài khoản trước khi đăng nhập.' };
  }, [client]);

  const refreshProfileStatus = useCallback(async () => {
    await resolveProfileStatus(session, true);
  }, [resolveProfileStatus, session]);

  const completeOnboarding = useCallback(async (): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    const { error } = await client.auth.updateUser({ data: {
      onboarding_display_name: null,
      onboarding_date_of_birth: null,
      onboarding_gender: null,
    } });
    if (error) return { ok: false, message: toSafeAuthMessage(error) };
    const { data } = await client.auth.getSession();
    await resolveProfileStatus(data.session, true);
    return { ok: true };
  }, [client, resolveProfileStatus]);

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
    completeOnboarding,
    refreshProfileStatus,
  }), [bootstrapError, completeOnboarding, recoveryPending, refreshProfileStatus, requestPasswordReset, session, signIn, signOut, signUp, status, updatePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
