export type SupabaseConfigInput = {
  url?: string;
  publishableKey?: string;
};

export type SupabaseConfigResult =
  | { configured: true; url: string; publishableKey: string }
  | { configured: false; reason: string };

const placeholderFragments = ['your-project', 'your_key', 'replace_me', 'substitute'];

export function validateSupabaseConfig(input: SupabaseConfigInput): SupabaseConfigResult {
  const url = input.url?.trim();
  const publishableKey = input.publishableKey?.trim();
  if (!url || !publishableKey) {
    return { configured: false, reason: 'Thiếu EXPO_PUBLIC_SUPABASE_URL hoặc EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.' };
  }
  if (placeholderFragments.some((fragment) => `${url} ${publishableKey}`.toLowerCase().includes(fragment))) {
    return { configured: false, reason: 'Biến Supabase vẫn đang dùng giá trị mẫu.' };
  }
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
  } catch {
    return { configured: false, reason: 'EXPO_PUBLIC_SUPABASE_URL không phải URL HTTP(S) hợp lệ.' };
  }
  return { configured: true, url, publishableKey };
}

export const supabaseConfig = validateSupabaseConfig({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
