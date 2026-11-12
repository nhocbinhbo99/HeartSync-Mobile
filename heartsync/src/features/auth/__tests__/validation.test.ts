import { validateAuthFields, validateEmail, validatePassword, validateSignUpFields } from '../validation';

describe('auth validation', () => {
  it('validates normalized email and password complexity (8+ chars, upper, lower, digit)', () => {
    expect(validateEmail(' person@example.com ')).toBe(true);
    expect(validatePassword('HeartSync123')).toBe(true);
    expect(validatePassword('12345678')).toBe(false);
    expect(validatePassword('heartsync123')).toBe(false);
    expect(validatePassword('HEARTSYNC123')).toBe(false);
    expect(validatePassword('HeartSyncApp')).toBe(false);
    expect(validatePassword('Abc123')).toBe(false);
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
      email: 'person@example.com', password: 'Password123', passwordConfirm: 'Password123',
      displayName: 'An Bình', dateOfBirth: '2000-01-02', gender: 'man',
    }, new Date('2026-11-03T00:00:00Z'))).toEqual({});
    expect(validateSignUpFields({
      email: 'person@example.com', password: 'Password123', passwordConfirm: 'different',
      displayName: 'A', dateOfBirth: '2010-01-02', gender: 'unknown',
    }, new Date('2026-11-03T00:00:00Z'))).toEqual(expect.objectContaining({
      passwordConfirm: expect.any(String), displayName: expect.any(String),
      dateOfBirth: expect.any(String), gender: expect.any(String),
    }));
  });
});
