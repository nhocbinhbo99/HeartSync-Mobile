import type { ApiError, ApiErrorCode } from '../shared/types/domain.types';

type ErrorRecord = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
};

const messages: Record<ApiErrorCode, string> = {
  unauthorized: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
  forbidden: 'Bạn không có quyền thực hiện thao tác này.',
  network: 'Không thể kết nối đến máy chủ. Hãy kiểm tra mạng và thử lại.',
  validation: 'Dữ liệu gửi lên không hợp lệ.',
  not_found: 'Không tìm thấy dữ liệu được yêu cầu.',
  conflict: 'Dữ liệu đã thay đổi hoặc thao tác bị xung đột.',
  rate_limited: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
};

function isRecord(value: unknown): value is ErrorRecord {
  return typeof value === 'object' && value !== null;
}

export function apiError(code: ApiErrorCode, retryable = code === 'network' || code === 'rate_limited'): ApiError {
  return { code, message: messages[code], retryable };
}

/** Maps transport/server details to stable UX-safe codes without exposing raw SQL or provider messages. */
export function mapServiceError(value: unknown): ApiError {
  if (!isRecord(value)) return apiError('network');

  const code = typeof value.code === 'string' ? value.code.toUpperCase() : '';
  const status = typeof value.status === 'number' ? value.status : Number.NaN;
  const message = typeof value.message === 'string' ? value.message.toLowerCase() : '';

  if (status === 401 || code === '28000' || code === 'PGRST301' || code === 'UNAUTHORIZED') return apiError('unauthorized', false);
  if (status === 403 || code === '42501' || code === 'FORBIDDEN') return apiError('forbidden', false);
  if (status === 404 || code === 'PGRST116' || code === 'NOT_FOUND') return apiError('not_found', false);
  if (status === 409 || code === '23505' || code === 'P0001' || code === 'CONFLICT') return apiError('conflict', false);
  if (status === 422 || code.startsWith('22') || code === '23514' || code === 'VALIDATION') return apiError('validation', false);
  if (status === 429 || code === 'RATE_LIMITED') return apiError('rate_limited');
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) return apiError('network');
  return apiError('conflict', false);
}
