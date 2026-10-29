import { extractAuthCallback } from '../deepLink';

describe('extractAuthCallback', () => {
  it('separates confirmation and password recovery callbacks', () => {
    expect(extractAuthCallback('heartsync://auth/callback?code=test-code')).toEqual({ code: 'test-code', purpose: 'confirmation' });
    expect(extractAuthCallback('heartsync://auth/recovery?code=reset-code')).toEqual({ code: 'reset-code', purpose: 'recovery' });
    expect(extractAuthCallback('heartsync://other/callback?code=test-code')).toBeNull();
    expect(extractAuthCallback('https://attacker.example/callback?code=test-code')).toBeNull();
  });
});
