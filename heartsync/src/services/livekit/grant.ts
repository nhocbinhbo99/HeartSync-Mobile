import type { CallJoinGrant } from '../contracts';
import type { CallType, Result } from '../../shared/types/domain.types';

type GrantRecord = Partial<Record<keyof CallJoinGrant, unknown>>;

function isCallType(value: unknown): value is CallType {
  return value === 'audio' || value === 'video';
}

export function parseCallJoinGrant(value: unknown, now = new Date()): Result<CallJoinGrant> {
  if (typeof value !== 'object' || value === null) return invalidGrant();
  const grant = value as GrantRecord;
  if (
    typeof grant.serverUrl !== 'string' ||
    !/^(wss|https):\/\//.test(grant.serverUrl) ||
    typeof grant.accessToken !== 'string' ||
    grant.accessToken.length < 20 ||
    typeof grant.roomName !== 'string' ||
    !grant.roomName.startsWith('match:') ||
    typeof grant.identity !== 'string' ||
    grant.identity.length === 0 ||
    !isCallType(grant.callType) ||
    typeof grant.expiresAt !== 'string'
  ) return invalidGrant();

  const expiresAt = Date.parse(grant.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return invalidGrant();
  return { ok: true, data: grant as CallJoinGrant };
}

function invalidGrant(): Result<CallJoinGrant> {
  return {
    ok: false,
    error: { code: 'conflict', message: 'Máy chủ trả về quyền tham gia cuộc gọi không hợp lệ.', retryable: false },
  };
}
