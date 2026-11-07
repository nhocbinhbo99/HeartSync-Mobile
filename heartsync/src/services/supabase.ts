import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../shared/types/database.types";
import { supabaseConfig } from "./supabaseConfig";

type Module3Database = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & {
      list_chat_matches: {
        Args: { p_cursor?: string };
        Returns: {
          id: string;
          other_profile: import("../shared/types/database.types").Json;
          created_at: string;
          last_message_preview: string | null;
          last_message_at: string;
          unread_count: number;
          cursor_created_at: string;
        }[];
      };
      send_chat_message: {
        Args: {
          p_match_id: string;
          p_client_message_id: string;
          p_content: string;
        };
        Returns: Database["public"]["Tables"]["messages"]["Row"];
      };
      mark_messages_read: {
        Args: { p_match_id: string; p_ids: string[] };
        Returns: undefined;
      };
      call_heartbeat: { Args: { p_call_id: string }; Returns: string };
      reconcile_calls: { Args: Record<string, never>; Returns: undefined };
      chat_summaries: {
        Args: Record<string, never>;
        Returns: {
          match_id: string;
          last_message_at: string | null;
          unread_count: number;
          last_read_at: string | null;
        }[];
      };
    };
  };
};
export type AppSupabaseClient = SupabaseClient<Module3Database>;

let client: AppSupabaseClient | null = null;

export function getSupabaseClient(): AppSupabaseClient | null {
  if (!supabaseConfig.configured) return null;
  if (!client) {
    client = createClient<Module3Database>(
      supabaseConfig.url,
      supabaseConfig.publishableKey,
      {
        auth: {
          storage: globalThis.localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      },
    );
  }
  return client;
}
