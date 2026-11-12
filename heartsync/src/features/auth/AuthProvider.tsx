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
  pendingSignInEmail?: string;
  pendingSignInNotice?: string;
  clearPendingSignInNotice: () => void;
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

async function tryConfirmEmailForDev(client: AppSupabaseClient, email: string): Promise<boolean> {
  try {
    const rpcClient = client as unknown as {
      rpc?: (fn: string, params: Record<string, unknown>) => Promise<{ data?: boolean; error?: unknown }>;
    };
    if (typeof rpcClient.rpc !== 'function') return false;
    const { data, error } = await rpcClient.rpc('confirm_user_email_for_dev', {
      target_email: email.trim(),
    });
    return !error && Boolean(data);
  } catch {
    return false;
  }
}

export function AuthProvider({ children, client = getSupabaseClient() }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>(client ? 'loading' : 'setup_required');
  const [session, setSession] = useState<Session | null>(null);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string>();
  const [pendingSignInEmail, setPendingSignInEmail] = useState<string>();
  const [pendingSignInNotice, setPendingSignInNotice] = useState<string>();
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

  const clearPendingSignInNotice = useCallback(() => {
    setPendingSignInNotice(undefined);
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    try {
      const normalizedEmail = email.trim();
      const { error } = await client.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) {
        const code = error.code?.toLowerCase() ?? '';
        const msg = error.message?.toLowerCase() ?? '';
        if (code.includes('email_not_confirmed') || msg.includes('email not confirmed')) {
          const confirmed = await tryConfirmEmailForDev(client, normalizedEmail);
          if (confirmed) {
            const retry = await client.auth.signInWithPassword({ email: normalizedEmail, password });
            if (!retry.error) {
              setPendingSignInNotice(undefined);
              return { ok: true };
            }
          }
        }
        return { ok: false, message: toSafeAuthMessage(error) };
      }
      setPendingSignInNotice(undefined);
      return { ok: true };
    } catch {
      return { ok: false, message: 'Không thể đăng nhập lúc này. Vui lòng thử lại.' };
    }
  }, [client]);

  const signUp = useCallback(async (input: SignUpInput): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    const normalizedEmail = input.email.trim();
    setPendingSignInEmail(normalizedEmail);
    try {
      const { data, error } = await client.auth.signUp({
        email: normalizedEmail,
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
      if (error) {
        const code = error.code?.toLowerCase() ?? '';
        const msg = error.message?.toLowerCase() ?? '';
        if (
          error.status === 429 ||
          code.includes('rate') ||
          msg.includes('rate limit') ||
          code.includes('already') ||
          msg.includes('already registered')
        ) {
          const confirmed = await tryConfirmEmailForDev(client, normalizedEmail);
          if (confirmed || code.includes('already') || msg.includes('already registered')) {
            const notice = 'Tài khoản đã được tạo! Vui lòng đăng nhập để tiếp tục.';
            setPendingSignInNotice(notice);
            return { ok: true, notice };
          }
        }
        return { ok: false, message: toSafeAuthMessage(error) };
      }
      const identities = (data as { user?: { identities?: unknown[] } | null })?.user?.identities;
      if (Array.isArray(identities) && identities.length === 0) {
        await tryConfirmEmailForDev(client, normalizedEmail);
        const notice = 'Email này đã có tài khoản. Vui lòng đăng nhập để tiếp tục.';
        setPendingSignInNotice(notice);
        return { ok: true, notice };
      }
      if (!data.session) {
        await tryConfirmEmailForDev(client, normalizedEmail);
      }
      const notice = data.session
        ? undefined
        : 'Đăng ký thành công! Vui lòng đăng nhập (hoặc kiểm tra email xác nhận nếu được yêu cầu).';
      if (notice) setPendingSignInNotice(notice);
      return { ok: true, notice };
    } catch {
      return { ok: false, message: 'Không thể hoàn tất đăng ký lúc này. Vui lòng thử lại.' };
    }
  }, [client]);

  const refreshProfileStatus = useCallback(async () => {
    await resolveProfileStatus(session, true);
  }, [resolveProfileStatus, session]);

  const completeOnboarding = useCallback(async (): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    try {
      const { error } = await client.auth.updateUser({ data: {
        onboarding_display_name: null,
        onboarding_date_of_birth: null,
        onboarding_gender: null,
      } });
      if (error) return { ok: false, message: toSafeAuthMessage(error) };
      const { data } = await client.auth.getSession();
      await resolveProfileStatus(data.session, true);
      return { ok: true };
    } catch {
      return { ok: false, message: 'Không thể hoàn tất hồ sơ lúc này. Vui lòng thử lại.' };
    }
  }, [client, resolveProfileStatus]);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    try {
      const normalizedEmail = email.trim();
      await tryConfirmEmailForDev(client, normalizedEmail);
      const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: PASSWORD_RECOVERY_URL });
      if (error) return { ok: false, message: toSafeAuthMessage(error) };
      return {
        ok: true,
        notice: 'Đã gửi liên kết khôi phục mật khẩu về email. Vui lòng kiểm tra cả Hộp thư đến và mục Thư rác (Spam).',
      };
    } catch {
      return { ok: false, message: 'Không thể gửi liên kết khôi phục mật khẩu lúc này. Vui lòng thử lại.' };
    }
  }, [client]);

  const updatePassword = useCallback(async (password: string): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) return { ok: false, message: toSafeAuthMessage(error) };
      setRecoveryPending(false);
      return { ok: true, notice: 'Mật khẩu đã được cập nhật.' };
    } catch {
      return { ok: false, message: 'Không thể cập nhật mật khẩu lúc này. Vui lòng thử lại.' };
    }
  }, [client]);

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
    try {
      const { error } = await client.auth.signOut();
      return error ? { ok: false, message: toSafeAuthMessage(error) } : { ok: true };
    } catch {
      return { ok: false, message: 'Không thể đăng xuất lúc này. Vui lòng thử lại.' };
    }
  }, [client]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    session,
    user: session?.user ?? null,
    recoveryPending,
    setupMessage: supabaseConfig.configured ? undefined : supabaseConfig.reason,
    bootstrapError,
    pendingSignInEmail,
    pendingSignInNotice,
    clearPendingSignInNotice,
    signIn,
    signUp,
    requestPasswordReset,
    updatePassword,
    signOut,
    completeOnboarding,
    refreshProfileStatus,
  }), [bootstrapError, clearPendingSignInNotice, completeOnboarding, pendingSignInEmail, pendingSignInNotice, recoveryPending, refreshProfileStatus, requestPasswordReset, session, signIn, signOut, signUp, status, updatePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
