import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseDiscoveryRepository } from '../supabaseFeatureRepositories';

const filters = { ageMin: 18, ageMax: 35, distanceKm: null, preferredGenders: ['woman'], preferredLanguages: ['vi'] };
const profile = {
  id: 'candidate-1', displayName: 'An', age: 24, gender: 'woman', bio: null,
  occupation: null, education: null, publicLocation: 'TP.HCM', profileCompletedAt: null,
  photos: [], interests: [], languages: ['vi'],
};

describe('SupabaseDiscoveryRepository', () => {
  it('rejects invalid filters before calling the discovery RPC', async () => {
    const rpc = jest.fn();
    const repository = new SupabaseDiscoveryRepository({ rpc } as unknown as SupabaseClient);

    await expect(repository.getCandidates({ ...filters, ageMin: 17 })).resolves.toMatchObject({ ok: false, error: { code: 'validation' } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('passes validated filters and pagination cursor only through the RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [{ profile, cursor_created_at: '2026-10-30T00:00:00.000Z' }], error: null });
    const repository = new SupabaseDiscoveryRepository({ rpc } as unknown as SupabaseClient);

    await expect(repository.getCandidates(filters, '2026-10-31T00:00:00.000Z')).resolves.toEqual({
      ok: true,
      data: { items: [profile], nextCursor: null },
    });
    expect(rpc).toHaveBeenCalledWith('get_discovery_candidates', {
      p_age_min: 18,
      p_age_max: 35,
      p_distance_km: null,
      p_preferred_genders: ['woman'],
      p_preferred_languages: ['vi'],
      p_limit: 20,
      p_cursor_created_at: '2026-10-31T00:00:00.000Z',
    });
  });

  it('rejects an invalid public profile instead of silently omitting it', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [{ profile: { ...profile, age: '24' }, cursor_created_at: '2026-10-30T00:00:00.000Z' }], error: null });
    const repository = new SupabaseDiscoveryRepository({ rpc } as unknown as SupabaseClient);

    await expect(repository.getCandidates(filters)).resolves.toMatchObject({ ok: false, error: { code: 'conflict' } });
  });
});
