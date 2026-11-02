import { validateAuthFields, validateEmail, validatePassword } from '../validation';

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
});
