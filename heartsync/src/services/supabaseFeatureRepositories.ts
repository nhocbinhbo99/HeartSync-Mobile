import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

import { dedupeMessages } from '../shared/domain/messages';
import type { CallType, ChatMessage, DiscoveryFilters, IncomingCall, Page, ProfilePublic, Result } from '../shared/types/domain.types';
import type { CallRepository, ChatRepository, DiscoveryRepository, MessageSubscription } from './contracts';
import { mapServiceError } from './errors';
import { parseProfilePublic, recordValue } from './profileMapper';

function invalid<T>(message = 'Máy chủ trả về dữ liệu không hợp lệ.'): Result<T> {
  return { ok: false, error: { code: 'conflict', message, retryable: false } };
}

function parseMessage(value: unknown): ChatMessage | null {
  const row = recordValue(value);
  if (!row || typeof row.id !== 'string' || typeof row.match_id !== 'string' || typeof row.sender_id !== 'string' || typeof row.client_message_id !== 'string' || typeof row.content !== 'string' || typeof row.sent_at !== 'string') return null;
  return { id: row.id, matchId: row.match_id, senderId: row.sender_id, clientMessageId: row.client_message_id, content: row.content, sentAt: row.sent_at, readAt: typeof row.read_at === 'string' ? row.read_at : null };
}

function parseCall(value: unknown): IncomingCall | null {
  const row = recordValue(value);
  if (!row || typeof row.id !== 'string' || typeof row.match_id !== 'string' || typeof row.caller_id !== 'string' || typeof row.callee_id !== 'string' || row.type !== 'audio' || typeof row.status !== 'string' || typeof row.started_at !== 'string') return null;
  const statuses = ['ringing', 'accepted', 'rejected', 'missed', 'connecting', 'connected', 'ended', 'failed'];
  if (!statuses.includes(row.status)) return null;
  return { id: row.id, matchId: row.match_id, callerId: row.caller_id, calleeId: row.callee_id, type: row.type as CallType, status: row.status as IncomingCall['status'], startedAt: row.started_at };
}

function unsubscribe(channel: RealtimeChannel, client: SupabaseClient): MessageSubscription {
  return { unsubscribe: () => { void client.removeChannel(channel); } };
}

export class SupabaseDiscoveryRepository implements DiscoveryRepository {
  constructor(private readonly client: SupabaseClient) {}
  async getCandidates(filters: DiscoveryFilters, cursor?: string): Promise<Result<Page<ProfilePublic>>> {
    const cursorCreatedAt = cursor ? new Date(cursor) : null;
    if (cursor && Number.isNaN(cursorCreatedAt?.getTime())) return invalid('Trang dữ liệu không hợp lệ.');
    const { data, error } = await this.client.rpc('get_discovery_candidates', {
      p_age_min: filters.ageMin,
      p_age_max: filters.ageMax,
      p_distance_km: filters.distanceKm,
      p_preferred_genders: filters.preferredGenders,
      p_preferred_languages: filters.preferredLanguages,
      p_limit: 20,
      p_cursor_created_at: cursorCreatedAt?.toISOString() ?? null,
    });
    if (error) return { ok: false, error: mapServiceError(error) };
    const rows = Array.isArray(data) ? data : [];
    const profiles = rows.map((row) => parseProfilePublic(recordValue(row)?.profile)).filter((profile): profile is ProfilePublic => profile !== null);
    const lastCursor = recordValue(rows.at(-1))?.cursor_created_at;
    return { ok: true, data: { items: profiles, nextCursor: typeof lastCursor === 'string' && rows.length === 20 ? lastCursor : null } };
  }
}

export class SupabaseChatRepository implements ChatRepository {
  constructor(private readonly client: SupabaseClient) {}
  async listMessages(matchId: string, _cursor?: string): Promise<Result<Page<ChatMessage>>> {
    const { data, error } = await this.client.from('messages').select('*').eq('match_id', matchId).order('sent_at', { ascending: true }).limit(100);
    if (error) return { ok: false, error: mapServiceError(error) };
    const messages = dedupeMessages((data ?? []).map(parseMessage).filter((message): message is ChatMessage => message !== null));
    return { ok: true, data: { items: messages, nextCursor: null } };
  }
  async sendMessage(input: { matchId: string; clientMessageId: string; content: string }): Promise<Result<ChatMessage>> {
    const { data: identity, error: authError } = await this.client.auth.getUser();
    if (authError || !identity.user) return { ok: false, error: mapServiceError(authError ?? { status: 401 }) };
    const { data, error } = await this.client.from('messages').insert({ match_id: input.matchId, sender_id: identity.user.id, client_message_id: input.clientMessageId, content: input.content.trim() }).select('*').single();
    if (error) return { ok: false, error: mapServiceError(error) };
    const message = parseMessage(data);
    return message ? { ok: true, data: message } : invalid();
  }
  subscribe(matchId: string, onMessage: (message: ChatMessage) => void, onError: (error: ReturnType<typeof mapServiceError>) => void): MessageSubscription {
    const channel = this.client.channel(`messages:${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, (payload) => {
        const message = parseMessage(payload.new);
        if (message) onMessage(message);
      })
      .subscribe((status) => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onError(mapServiceError({ message: 'realtime network' })); });
    return unsubscribe(channel, this.client);
  }
}

export class SupabaseCallRepository implements CallRepository {
  constructor(private readonly client: SupabaseClient) {}
  private async loadCall(callId: string): Promise<Result<IncomingCall>> {
    const { data, error } = await this.client.from('calls').select('*').eq('id', callId).single();
    if (error) return { ok: false, error: mapServiceError(error) };
    const call = parseCall(data);
    return call ? { ok: true, data: call } : invalid();
  }
  async startAudioCall(matchId: string): Promise<Result<IncomingCall>> {
    const { data, error } = await this.client.rpc('start_call', { p_match_id: matchId, p_type: 'audio' });
    if (error || typeof data !== 'string') return { ok: false, error: mapServiceError(error ?? { code: 'P0001' }) };
    return this.loadCall(data);
  }
  async acceptCall(callId: string): Promise<Result<IncomingCall>> {
    const { data, error } = await this.client.rpc('accept_call', { p_call_id: callId });
    if (error || typeof data !== 'string') return { ok: false, error: mapServiceError(error ?? { code: 'P0001' }) };
    return this.loadCall(data);
  }
  async rejectCall(callId: string): Promise<Result<void>> {
    const { error } = await this.client.rpc('reject_call', { p_call_id: callId });
    return error ? { ok: false, error: mapServiceError(error) } : { ok: true, data: undefined };
  }
  async endCall(callId: string): Promise<Result<void>> {
    const { error } = await this.client.rpc('end_call', { p_call_id: callId });
    return error ? { ok: false, error: mapServiceError(error) } : { ok: true, data: undefined };
  }
  subscribeIncoming(onCall: (call: IncomingCall) => void, onError: (error: ReturnType<typeof mapServiceError>) => void): MessageSubscription {
    const channel = this.client.channel('calls:mine')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, (payload) => {
        const call = parseCall(payload.new);
        if (call) onCall(call);
      })
      .subscribe((status) => { if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onError(mapServiceError({ message: 'realtime network' })); });
    return unsubscribe(channel, this.client);
  }
}
