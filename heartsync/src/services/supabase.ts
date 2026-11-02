import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './supabaseConfig';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseConfig.configured) return null;
  if (!client) {
    client = createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
      auth: {
        storage: globalThis.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
  }
  return client;
}
