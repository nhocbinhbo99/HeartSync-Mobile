import { toSafeAuthMessage } from '../authError';

describe('auth error messages', () => {
  it('explains an unconfirmed email without exposing other provider details', () => {
    expect(toSafeAuthMessage({ code: 'email_not_confirmed', message: 'Email not confirmed' }))
      .toBe('Email này chưa được xác nhận. Hãy mở hộp thư và bấm liên kết xác nhận.');
  });

  it('keeps invalid credentials intentionally generic', () => {
    expect(toSafeAuthMessage({ status: 400, message: 'Invalid login credentials' }))
      .toBe('Email hoặc mật khẩu không đúng.');
  });
});
