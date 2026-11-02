type ErrorLike = { message?: string; status?: number; code?: string } | null | undefined;

export function toSafeAuthMessage(error: ErrorLike) {
  const status = error?.status;
  const code = error?.code?.toLowerCase() ?? '';
  const message = error?.message?.toLowerCase() ?? '';
  if (code.includes('email_not_confirmed') || message.includes('email not confirmed')) {
    return 'Email này chưa được xác nhận. Hãy mở hộp thư và bấm liên kết xác nhận.';
  }
  if (status === 429 || code.includes('rate') || message.includes('rate limit')) {
    return 'Bạn đã thử quá nhiều lần. Vui lòng đợi rồi thử lại.';
  }
  if (status === 400 || code.includes('invalid') || message.includes('invalid login')) {
    return 'Email hoặc mật khẩu không đúng.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Không thể kết nối dịch vụ. Kiểm tra mạng rồi thử lại.';
  }
  return 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.';
}
