import type { CallStatus, Result } from '../types/domain.types';

export type CallEvent =
  | 'ring'
  | 'accept_requested'
  | 'media_connecting'
  | 'media_connected'
  | 'reject'
  | 'miss'
  | 'end'
  | 'fail';

const transitions: Partial<Record<CallStatus, Partial<Record<CallEvent, CallStatus>>>> = {
  idle: { ring: 'ringing', fail: 'failed' },
  ringing: { accept_requested: 'accepted', reject: 'rejected', miss: 'missed', fail: 'failed' },
  accepted: { media_connecting: 'connecting', end: 'ended', fail: 'failed' },
  connecting: { media_connected: 'connected', end: 'ended', fail: 'failed' },
  connected: { end: 'ended', fail: 'failed' },
};

export function transitionCallStatus(current: CallStatus, event: CallEvent): Result<CallStatus> {
  const next = transitions[current]?.[event];
  if (!next) return { ok: false, error: { code: 'conflict', message: 'Chuyển trạng thái cuộc gọi không hợp lệ.', retryable: false } };
  return { ok: true, data: next };
}
