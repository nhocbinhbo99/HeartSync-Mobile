import type { RealtimeChannel } from "@supabase/supabase-js";

import { dedupeMessages } from '../shared/domain/messages';
import { validateDiscoveryFilters } from '../shared/domain/filters';
import type {
  CallType,
  ChatMessage,
  DiscoveryFilters,
  IncomingCall,
  Page,
  ProfilePublic,
  Result,
} from '../shared/types/domain.types';
import type {
  CallRepository,
  ChatRepository,
  DiscoveryRepository,
  MessageSubscription,
} from './contracts';
import { mapServiceError } from './errors';
import { parseProfilePublic, recordValue } from './profileMapper';
import type { AppSupabaseClient } from './supabase';

let subscriptionId = 0;

function invalid<T>(
  message = "Máy chủ trả về dữ liệu không hợp lệ.",
): Result<T> {
  return { ok: false, error: { code: "conflict", message, retryable: false } };
}

function parseMessage(value: unknown): ChatMessage | null {
  const row = recordValue(value);
  if (
    !row ||
    typeof row.id !== "string" ||
    typeof row.match_id !== "string" ||
    typeof row.sender_id !== "string" ||
    typeof row.client_message_id !== "string" ||
    typeof row.content !== "string" ||
    typeof row.sent_at !== "string"
  )
    return null;
  return {
    id: row.id,
    matchId: row.match_id,
    senderId: row.sender_id,
    clientMessageId: row.client_message_id,
    content: row.content,
    sentAt: row.sent_at,
    readAt: typeof row.read_at === "string" ? row.read_at : null,
  };
}

function parseCall(value: unknown): IncomingCall | null {
  const row = recordValue(value);
  if (
    !row ||
    typeof row.id !== "string" ||
    typeof row.match_id !== "string" ||
    typeof row.caller_id !== "string" ||
    typeof row.callee_id !== "string" ||
    (row.type !== "audio" && row.type !== "video") ||
    typeof row.status !== "string" ||
    typeof row.started_at !== "string"
  )
    return null;
  const statuses = [
    "ringing",
    "accepted",
    "rejected",
    "missed",
    "connecting",
    "connected",
    "ended",
    "failed",
  ];
  if (!statuses.includes(row.status)) return null;
  return {
    id: row.id,
    matchId: row.match_id,
    callerId: row.caller_id,
    calleeId: row.callee_id,
    type: row.type as CallType,
    status: row.status as IncomingCall["status"],
    startedAt: row.started_at,
  };
}

function unsubscribe(
  channel: RealtimeChannel,
  client: AppSupabaseClient,
): MessageSubscription {
  return {
    unsubscribe: () => {
      void client.removeChannel(channel);
    },
  };
}

export class SupabaseDiscoveryRepository implements DiscoveryRepository {
  constructor(private readonly client: AppSupabaseClient) {}
async getCandidates(filters: DiscoveryFilters, cursor?: string): Promise<Result<Page<ProfilePublic>>> {
    const checked = validateDiscoveryFilters(filters);
    if (!checked.ok) return { ok: false, error: checked.error };
    const cursorCreatedAt = cursor ? new Date(cursor) : null;
    if (cursor && Number.isNaN(cursorCreatedAt?.getTime()))
      return invalid("Trang dữ liệu không hợp lệ.");
    const { data, error } = await this.client.rpc("get_discovery_candidates", {
      p_age_min: filters.ageMin,
      p_age_max: filters.ageMax,
      p_distance_km: filters.distanceKm ?? undefined,
      p_preferred_genders: filters.preferredGenders,
      p_preferred_languages: filters.preferredLanguages,
      p_limit: 20,
      p_cursor_created_at: cursorCreatedAt?.toISOString(),
    });
    if (error) return { ok: false, error: mapServiceError(error) };
if (!Array.isArray(data)) return invalid();
    const rows = data;
    const profiles = rows.map((row) => parseProfilePublic(recordValue(row)?.profile));
    if (profiles.some((profile) => profile === null)) return invalid();
    const lastCursor = recordValue(rows.at(-1))?.cursor_created_at;
    return { ok: true, data: { items: profiles as ProfilePublic[], nextCursor: typeof lastCursor === 'string' && rows.length === 20 ? lastCursor : null } };
  }
}

export class SupabaseChatRepository implements ChatRepository {
  async getRecipient(matchId: string): Promise<Result<ProfilePublic>> {
    const { data: auth, error: authError } = await this.client.auth.getUser();
    if (authError || !auth.user)
      return { ok: false, error: mapServiceError({ status: 401 }) };
    const { data: match, error } = await this.client
      .from("matches")
      .select("user_low_id,user_high_id")
      .eq("id", matchId)
      .single();
    if (error || !match) return { ok: false, error: mapServiceError(error) };
    const id =
      match.user_low_id === auth.user.id
        ? match.user_high_id
        : match.user_low_id;
    const { data, error: profileError } = await this.client.rpc(
      "get_public_profile",
      { p_profile_id: id },
    );
    if (profileError)
      return { ok: false, error: mapServiceError(profileError) };
    const profile = parseProfilePublic(data);
    return profile ? { ok: true, data: profile } : invalid();
  }
  subscribeInbox(onChange: () => void): MessageSubscription {
    const channel = this.client
      .channel(`inbox:${++subscriptionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        onChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        onChange,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") onChange();
      });
    return unsubscribe(channel, this.client);
  }
  async isActive(matchId: string): Promise<Result<boolean>> {
    const { data, error } = await this.client
      .from("matches")
      .select("status")
      .eq("id", matchId)
      .maybeSingle();
    if (!error && !data) return { ok: false, error: mapServiceError({ status: 403 }) };
    return error
      ? { ok: false, error: mapServiceError(error) }
      : { ok: true, data: data?.status === "active" };
  }
  constructor(private readonly client: AppSupabaseClient) {}
  async listMessages(
    matchId: string,
    cursor?: string,
  ): Promise<Result<Page<ChatMessage>>> {
    let query = this.client
      .from("messages")
      .select("*")
      .eq("match_id", matchId)
      .order("sent_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(40);
    if (cursor) {
      const [time, id] = cursor.split("|");
      if (
        !/^[-0-9a-f]{36}$/i.test(id ?? "") ||
        !/^\d{4}-\d{2}-\d{2}T[0-9:.+Z-]+$/.test(time ?? "")
      )
        return invalid("Trang dữ liệu không hợp lệ.");
      query = query.or(
        `sent_at.lt.${time},and(sent_at.eq.${time},id.lt.${id})`,
      );
    }
    const { data, error } = await query;
    if (error) return { ok: false, error: mapServiceError(error) };
    const messages = dedupeMessages(
      (data ?? [])
        .map(parseMessage)
        .filter((message): message is ChatMessage => message !== null),
    );
    return {
      ok: true,
      data: {
        items: messages.reverse(),
        nextCursor:
          data?.length === 40 && data[39]
            ? `${data[39].sent_at}|${data[39].id}`
            : null,
      },
    };
  }
  async sendMessage(input: {
    matchId: string;
    clientMessageId: string;
    content: string;
  }): Promise<Result<ChatMessage>> {
    const { data: identity, error: authError } =
      await this.client.auth.getUser();
    if (authError || !identity.user)
      return {
        ok: false,
        error: mapServiceError(authError ?? { status: 401 }),
      };
    const { data, error } = await this.client.rpc("send_chat_message", {
      p_match_id: input.matchId,
      p_client_message_id: input.clientMessageId,
      p_content: input.content.trim(),
    });
    if (error) return { ok: false, error: mapServiceError(error) };
    const message = parseMessage(data);
    return message ? { ok: true, data: message } : invalid();
  }
  async markRead(matchId: string, ids: string[]): Promise<Result<void>> {
    const { error } = await this.client.rpc("mark_messages_read", {
      p_match_id: matchId,
      p_ids: ids,
    });
    return error
      ? { ok: false, error: mapServiceError(error) }
      : { ok: true, data: undefined };
  }
  subscribe(
    matchId: string,
    onMessage: (message: ChatMessage) => void,
    onError: (error: ReturnType<typeof mapServiceError>) => void,
  ): MessageSubscription {
    const channel = this.client
      .channel(`messages:${matchId}:${++subscriptionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const message = parseMessage(payload.new);
          if (message) onMessage(message);
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          onError(mapServiceError({ message: "realtime network" }));
      });
    return unsubscribe(channel, this.client);
  }
}

export class SupabaseCallRepository implements CallRepository {
  constructor(private readonly client: AppSupabaseClient) {}
  async loadCall(callId: string): Promise<Result<IncomingCall>> {
    const { data, error } = await this.client
      .from("calls")
      .select("*")
      .eq("id", callId)
      .single();
    if (error) return { ok: false, error: mapServiceError(error) };
    const call = parseCall(data);
    return call ? { ok: true, data: call } : invalid();
  }
  async listActive(): Promise<Result<IncomingCall[]>> {
    const { error: reconcileError } = await this.client.rpc("reconcile_calls");
    if (reconcileError)
      return { ok: false, error: mapServiceError(reconcileError) };
    const { data, error } = await this.client
      .from("calls")
      .select("*")
      .in("status", ["ringing", "accepted", "connecting", "connected"]);
    return error
      ? { ok: false, error: mapServiceError(error) }
      : {
          ok: true,
          data: (data ?? [])
            .map(parseCall)
            .filter((c): c is IncomingCall => c !== null),
        };
  }
  async startAudioCall(matchId: string): Promise<Result<IncomingCall>> {
    return this.startCall(matchId, "audio");
  }
  async startVideoCall(matchId: string): Promise<Result<IncomingCall>> {
    return this.startCall(matchId, "video");
  }
  private async startCall(matchId: string, type: CallType): Promise<Result<IncomingCall>> {
    const { data, error } = await this.client.rpc("start_call", {
      p_match_id: matchId,
      p_type: type,
    });
    if (error || typeof data !== "string")
      return { ok: false, error: mapServiceError(error ?? { code: "P0001" }) };
    return this.loadCall(data);
  }
  async acceptCall(callId: string): Promise<Result<IncomingCall>> {
    const { data, error } = await this.client.rpc("accept_call", {
      p_call_id: callId,
    });
    if (error || typeof data !== "string")
      return { ok: false, error: mapServiceError(error ?? { code: "P0001" }) };
    return this.loadCall(data);
  }
  async rejectCall(callId: string): Promise<Result<void>> {
    const { error } = await this.client.rpc("reject_call", {
      p_call_id: callId,
    });
    return error
      ? { ok: false, error: mapServiceError(error) }
      : { ok: true, data: undefined };
  }
  async endCall(callId: string): Promise<Result<void>> {
    const { error } = await this.client.rpc("end_call", { p_call_id: callId });
    return error
      ? { ok: false, error: mapServiceError(error) }
      : { ok: true, data: undefined };
  }
  subscribeIncoming(
    onCall: (call: IncomingCall) => void,
    onError: (error: ReturnType<typeof mapServiceError>) => void,
  ): MessageSubscription {
    const channel = this.client
      .channel(`calls:${++subscriptionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        (payload) => {
          const call = parseCall(payload.new);
          if (call) onCall(call);
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          onError(mapServiceError({ message: "realtime network" }));
      });
    return unsubscribe(channel, this.client);
  }
}
