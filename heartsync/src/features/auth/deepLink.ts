export const AUTH_CALLBACK_URL = 'heartsync://auth/callback';
export const PASSWORD_RECOVERY_URL = 'heartsync://auth/recovery';

export function extractAuthCallback(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'heartsync:' || parsed.hostname !== 'auth') return null;
    const purpose = parsed.pathname === '/recovery' ? 'recovery' : parsed.pathname === '/callback' ? 'confirmation' : null;
    const code = parsed.searchParams.get('code');
    return purpose && code ? { code, purpose } as const : null;
  } catch {
    return null;
  }
}
