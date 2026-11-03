import { validateAuthFields, validateEmail, validatePassword, validateSignUpFields } from '../validation';

describe('auth validation', () => {
  it('validates normalized email and minimum password length', () => {
    expect(validateEmail(' person@example.com ')).toBe(true);
    expect(validatePassword('12345678')).toBe(true);
  });

  it('returns field-specific errors including the 18+ confirmation', () => {
    expect(validateAuthFields('bad', 'short', false)).toEqual({
      email: expect.any(String),
      password: expect.any(String),
      age: expect.any(String),
    });
  });

  it('validates structured signup fields and the real date of birth', () => {
    expect(validateSignUpFields({
      email: 'person@example.com', password: 'password123', passwordConfirm: 'password123',
      displayName: 'An Bình', dateOfBirth: '2000-01-02', gender: 'man',
    }, new Date('2026-11-03T00:00:00Z'))).toEqual({});
    expect(validateSignUpFields({
      email: 'person@example.com', password: 'password123', passwordConfirm: 'different',
      displayName: 'A', dateOfBirth: '2010-01-02', gender: 'unknown',
    }, new Date('2026-11-03T00:00:00Z'))).toEqual(expect.objectContaining({
      passwordConfirm: expect.any(String), displayName: expect.any(String),
      dateOfBirth: expect.any(String), gender: expect.any(String),
    }));
  });
});
