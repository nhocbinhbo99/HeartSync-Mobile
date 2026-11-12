import { isAdult } from '../../shared/domain/age';
import { GENDER_OPTIONS } from '../../shared/domain/profileOptions';

export type AuthFieldErrors = {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  displayName?: string;
  dateOfBirth?: string;
  gender?: string;
  age?: string;
};

export const PASSWORD_REQUIREMENT_MESSAGE =
  'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.';

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export function validateAuthFields(email: string, password?: string, ageConfirmed = true): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (!validateEmail(email)) errors.email = 'Nhập một địa chỉ email hợp lệ.';
  if (password !== undefined && !validatePassword(password)) {
    errors.password = PASSWORD_REQUIREMENT_MESSAGE;
  }
  if (!ageConfirmed) errors.age = 'Bạn phải xác nhận mình từ 18 tuổi.';
  return errors;
}

export function validateSignUpFields(input: {
  email: string;
  password: string;
  passwordConfirm: string;
  displayName: string;
  dateOfBirth: string;
  gender: string;
}, today = new Date()): AuthFieldErrors {
  const errors = validateAuthFields(input.email, input.password);
  if (input.password !== input.passwordConfirm) errors.passwordConfirm = 'Mật khẩu xác nhận chưa khớp.';
  const displayNameLength = input.displayName.trim().length;
  if (displayNameLength < 2 || displayNameLength > 80) errors.displayName = 'Tên hiển thị cần từ 2 đến 80 ký tự.';
  if (!isAdult(input.dateOfBirth, today)) errors.dateOfBirth = 'Bạn cần đủ 18 tuổi để sử dụng HeartSync.';
  if (!GENDER_OPTIONS.some((option) => option.value === input.gender)) errors.gender = 'Hãy chọn một lựa chọn giới tính.';
  return errors;
}
