import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../shared/types/database.types';
import { supabaseConfig } from './supabaseConfig';

export type AppSupabaseClient = SupabaseClient<Database>;

let client: AppSupabaseClient | null = null;

export function getSupabaseClient(): AppSupabaseClient | null {
  if (!supabaseConfig.configured) return null;
  if (!client) {
    client = createClient<Database>(supabaseConfig.url, supabaseConfig.publishableKey, {
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
