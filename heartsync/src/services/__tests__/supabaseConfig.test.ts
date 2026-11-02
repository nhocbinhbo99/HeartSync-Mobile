import { validateSupabaseConfig } from '../supabaseConfig';

describe('validateSupabaseConfig', () => {
  it('reports setup required when variables are missing', () => {
    expect(validateSupabaseConfig({})).toEqual(expect.objectContaining({ configured: false }));
  });

  it('rejects committed placeholder values', () => {
    expect(validateSupabaseConfig({
      url: 'https://your-project-ref.supabase.co',
      publishableKey: 'sb_publishable_your_key_here',
    })).toEqual(expect.objectContaining({ configured: false }));
  });

  it('accepts an HTTP(S) endpoint and non-placeholder publishable key', () => {
    expect(validateSupabaseConfig({
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_example_public_value',
    })).toEqual({
      configured: true,
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_example_public_value',
    });
  });
});
