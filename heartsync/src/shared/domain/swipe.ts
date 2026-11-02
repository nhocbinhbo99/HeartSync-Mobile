import type { Result, SwipeResult } from '../types/domain.types';

type RecordSwipeRow = { outcome?: unknown; match_id?: unknown };

const invalidResponse = (): Result<SwipeResult> => ({
  ok: false,
  error: { code: 'conflict', message: 'Máy chủ trả về trạng thái swipe không hợp lệ.', retryable: false },
});

export function parseRecordSwipeResponse(value: unknown): Result<SwipeResult> {
  const row = Array.isArray(value) ? value[0] as RecordSwipeRow | undefined : value as RecordSwipeRow | null;
  if (!row) return invalidResponse();
  if (row.outcome === 'liked' && (row.match_id === null || row.match_id === undefined)) {
    return { ok: true, data: { outcome: 'liked', matchId: null } };
  }
  if (row.outcome === 'passed' && (row.match_id === null || row.match_id === undefined)) {
    return { ok: true, data: { outcome: 'passed', matchId: null } };
  }
  if (row.outcome === 'matched' && typeof row.match_id === 'string' && row.match_id.length > 0) {
    return { ok: true, data: { outcome: 'matched', matchId: row.match_id } };
  }
  return invalidResponse();
}
