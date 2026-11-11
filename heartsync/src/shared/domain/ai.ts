import type { ApiError, ApiErrorCode } from '../types/domain.types';

export type AiFeature = 'profile_bio' | 'icebreaker';
export type AiTone = 'natural' | 'playful' | 'sincere' | 'friendly';
export type AiQuota = {
  limit: 2;
  used: number;
  remaining: number;
  resetAt: string | null;
};
export type AiQuotas = { profileBio: AiQuota; icebreaker: AiQuota };
export type AiBioInput = {
  requestId: string;
  tone: Extract<AiTone, 'natural' | 'playful' | 'sincere'>;
  ideas: string;
};
export type AiIcebreakerInput = {
  requestId: string;
  matchId: string;
  tone: Extract<AiTone, 'friendly'>;
};
export type AiBioGeneration = { suggestion: string; quota: AiQuota; requestId: string };
export type AiIcebreakerGeneration = { suggestions: [string, string, string]; quota: AiQuota; requestId: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const bioTones = new Set<AiBioInput['tone']>(['natural', 'playful', 'sincere']);

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function textLength(value: string) {
  return [...value.trim()].length;
}

export function isRequestId(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value);
}

export function validateAiBioInput(input: AiBioInput): string | null {
  if (!isRequestId(input.requestId)) return 'Mã yêu cầu AI không hợp lệ.';
  if (!bioTones.has(input.tone)) return 'Giọng văn AI không hợp lệ.';
  const length = textLength(input.ideas);
  if (length < 3 || length > 800) return 'Hãy nhập 3–800 ký tự về những điều bạn muốn chia sẻ.';
  return null;
}

export function validateAiIcebreakerInput(input: AiIcebreakerInput): string | null {
  if (!isRequestId(input.requestId) || !isRequestId(input.matchId)) return 'Yêu cầu kết nối AI không hợp lệ.';
  return input.tone === 'friendly' ? null : 'Giọng văn AI không hợp lệ.';
}

export function parseAiQuota(value: unknown): AiQuota | null {
  const quota = record(value);
  const used = quota?.used;
  const remaining = quota?.remaining;
  if (!quota || quota.limit !== 2 || typeof used !== 'number' || typeof remaining !== 'number'
    || !Number.isInteger(used) || !Number.isInteger(remaining)
    || (typeof quota.reset_at !== 'string' && quota.reset_at !== null)
    || used < 0 || used > 2 || remaining < 0 || remaining > 2) return null;
  return { limit: 2, used, remaining, resetAt: quota.reset_at };
}

export function parseAiQuotas(value: unknown): AiQuotas | null {
  const result = record(value);
  const profileBio = parseAiQuota(result?.profile_bio);
  const icebreaker = parseAiQuota(result?.icebreaker);
  return profileBio && icebreaker ? { profileBio, icebreaker } : null;
}

export function isValidBioSuggestion(value: unknown): value is string {
  const length = typeof value === 'string' ? textLength(value) : 0;
  return length >= 80 && length <= 300;
}

function isIcebreakerSentence(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const suggestion = value.trim();
  const length = textLength(suggestion);
  return length >= 20 && length <= 160
    && (suggestion.includes('?') || /^(chào|hello|hi|mình|dạo này|cuối tuần)/iu.test(suggestion));
}

export function isValidIcebreakerSuggestions(value: unknown): value is [string, string, string] {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(isIcebreakerSentence)) return false;
  return new Set(value.map((item) => item.trim().toLocaleLowerCase('vi-VN'))).size === 3;
}

export function parseAiBioGeneration(value: unknown): AiBioGeneration | null {
  const payload = record(value);
  const quota = parseAiQuota(payload?.quota);
  return payload?.action === 'generate_bio' && isRequestId(payload.request_id) && isValidBioSuggestion(payload.suggestion) && quota
    ? { suggestion: payload.suggestion.trim(), quota, requestId: payload.request_id }
    : null;
}

export function parseAiIcebreakerGeneration(value: unknown): AiIcebreakerGeneration | null {
  const payload = record(value);
  const quota = parseAiQuota(payload?.quota);
  return payload?.action === 'generate_icebreaker' && isRequestId(payload.request_id)
    && isValidIcebreakerSuggestions(payload.suggestions) && quota
    ? { suggestions: payload.suggestions.map((item) => item.trim()) as [string, string, string], quota, requestId: payload.request_id }
    : null;
}

const errorByServerCode: Record<string, ApiErrorCode> = {
  UNAUTHENTICATED: 'unauthorized',
  INVALID_INPUT: 'validation',
  MATCH_NOT_ALLOWED: 'forbidden',
  AI_QUOTA_EXHAUSTED: 'quota_exhausted',
  GEMINI_RATE_LIMITED: 'rate_limited',
  AI_TEMPORARILY_UNAVAILABLE: 'unavailable',
  AI_OUTPUT_INVALID: 'unavailable',
  REQUEST_IN_PROGRESS: 'request_in_progress',
};

export function mapAiServerError(value: unknown): ApiError | null {
  const payload = record(value);
  const code = typeof payload?.code === 'string' ? errorByServerCode[payload.code] : undefined;
  if (!code) return null;
  const messages: Record<ApiErrorCode, string> = {
    unauthorized: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
    forbidden: 'Kết nối này không còn khả dụng.',
    network: 'Không thể kết nối đến máy chủ. Hãy kiểm tra mạng và thử lại.',
    validation: 'Dữ liệu gửi lên không hợp lệ.',
    not_found: 'Không tìm thấy dữ liệu được yêu cầu.',
    conflict: 'Dữ liệu đã thay đổi hoặc thao tác bị xung đột.',
    rate_limited: 'Dịch vụ AI đang bận. Vui lòng thử lại sau.',
    quota_exhausted: 'Bạn đã dùng hết lượt AI miễn phí.',
    unavailable: 'AI tạm thời chưa khả dụng. Vui lòng thử lại sau.',
    request_in_progress: 'Yêu cầu AI đang được xử lý. Vui lòng đợi một chút.',
  };
  return { code, message: messages[code], retryable: code === 'network' || code === 'rate_limited' || code === 'unavailable' || code === 'request_in_progress' };
}
