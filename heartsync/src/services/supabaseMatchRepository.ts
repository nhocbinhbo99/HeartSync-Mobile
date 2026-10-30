import type { SupabaseClient } from '@supabase/supabase-js';
import type { MatchRepository } from './contracts';
import { mapServiceError } from './errors';
import { parseRecordSwipeResponse } from '../shared/domain/swipe';
import type { MatchSummary, Page, Result, SwipeAction, SwipeResult } from '../shared/types/domain.types';

const notImplemented = <T>(): Result<T> => ({
  ok: false,
  error: { code: 'conflict', message: 'Endpoint này chưa được triển khai trong Q04.', retryable: false },
});

/** Minimal Q04 adapter. UI code depends on MatchRepository, not this Supabase implementation. */
export class SupabaseMatchRepository implements MatchRepository {
  constructor(private readonly client: SupabaseClient) {}

  async recordSwipe(targetProfileId: string, action: SwipeAction): Promise<Result<SwipeResult>> {
    const { data, error } = await this.client.rpc('record_swipe', {
      p_target_id: targetProfileId,
      p_action: action,
    });
    if (error) return { ok: false, error: mapServiceError(error) };
    return parseRecordSwipeResponse(data);
  }

  async listMatches(_cursor?: string): Promise<Result<Page<MatchSummary>>> {
    return notImplemented();
  }

  async unmatch(matchId: string): Promise<Result<void>> {
    const { error } = await this.client.rpc('unmatch', { p_match_id: matchId });
    return error ? { ok: false, error: mapServiceError(error) } : { ok: true, data: undefined };
  }

  async blockUser(targetProfileId: string): Promise<Result<void>> {
    const { error } = await this.client.rpc('block_user', { p_target_id: targetProfileId });
    return error ? { ok: false, error: mapServiceError(error) } : { ok: true, data: undefined };
  }
}
