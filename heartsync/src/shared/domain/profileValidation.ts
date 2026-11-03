import { isAdult } from './age';
import { GENDER_OPTIONS, LANGUAGE_OPTIONS } from './profileOptions';

export type ProfileFieldErrors = Partial<Record<
  'displayName' | 'gender' | 'dateOfBirth' | 'bio' | 'occupation' | 'education' | 'publicLocation' | 'interests' | 'languages',
  string
>>;

export type ProfileValidationInput = {
  displayName: string;
  gender: string;
  dateOfBirth: string;
  bio: string;
  occupation: string;
  education: string;
  publicLocation: string;
  interests: string[];
  languages: string[];
};

export function validateProfile(input: ProfileValidationInput, today = new Date()): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const nameLength = input.displayName.trim().length;
  if (nameLength < 2 || nameLength > 80) errors.displayName = 'Tên hiển thị cần từ 2 đến 80 ký tự.';
  if (!GENDER_OPTIONS.some((option) => option.value === input.gender)) errors.gender = 'Hãy chọn một lựa chọn giới tính hợp lệ.';
  if (!isAdult(input.dateOfBirth, today)) errors.dateOfBirth = 'Bạn cần nhập ngày sinh hợp lệ và đủ 18 tuổi.';
  if (input.bio.length > 500) errors.bio = 'Giới thiệu không được vượt quá 500 ký tự.';
  if (input.occupation.trim().length > 120) errors.occupation = 'Nghề nghiệp không được vượt quá 120 ký tự.';
  if (input.education.trim().length > 160) errors.education = 'Học vấn không được vượt quá 160 ký tự.';
  if (input.publicLocation.trim().length > 120) errors.publicLocation = 'Khu vực không được vượt quá 120 ký tự.';
  if (new Set(input.interests).size !== input.interests.length) errors.interests = 'Sở thích không được trùng nhau.';
  const supportedLanguages = new Set(LANGUAGE_OPTIONS.map((option) => option.value));
  if (input.languages.some((language) => !supportedLanguages.has(language))) errors.languages = 'Có ngôn ngữ không được hỗ trợ.';
  return errors;
}

export function hasProfileErrors(errors: ProfileFieldErrors) {
  return Object.keys(errors).length > 0;
}
