export type AuthFieldErrors = { email?: string; password?: string; age?: string };

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string) {
  return password.length >= 8;
}

export function validateAuthFields(email: string, password?: string, ageConfirmed = true): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (!validateEmail(email)) errors.email = 'Nhập một địa chỉ email hợp lệ.';
  if (password !== undefined && !validatePassword(password)) errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (!ageConfirmed) errors.age = 'Bạn phải xác nhận mình từ 18 tuổi.';
  return errors;
}
