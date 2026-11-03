import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabasePreferencesRepository, SupabaseProfileRepository, SupabaseSavedProfilesRepository } from '../supabaseProfileRepositories';

const publicProfile = {
  id: 'profile-a', displayName: 'An Bình', age: 28, gender: 'man', bio: null,
  occupation: 'Thiết kế', education: 'Đại học', publicLocation: 'TP. Hồ Chí Minh',
  profileCompletedAt: '2026-11-03T00:00:00Z', photos: [], interests: ['Đọc sách'], languages: ['vi'],
};

describe('Supabase profile repositories', () => {
  it('sends private profile fields only to the atomic owner RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: publicProfile, error: null });
    const client = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'profile-a' } }, error: null }) },
      rpc,
    } as unknown as SupabaseClient;
    const repository = new SupabaseProfileRepository(client);

    const result = await repository.save({
      displayName: ' An Bình ', gender: 'man', dateOfBirth: '1998-01-01', bio: null,
      occupation: 'Thiết kế', education: 'Đại học', publicLocation: 'TP. Hồ Chí Minh',
      interests: ['Đọc sách'], languages: ['vi'], locationConsent: false, latitude: 10.7, longitude: 106.6,
    });

    expect(result).toMatchObject({ ok: true, data: { public: publicProfile, private: {
      dateOfBirth: '1998-01-01', locationConsent: false, latitude: null, longitude: null,
    } } });
    expect(rpc).toHaveBeenCalledWith('save_my_profile', expect.objectContaining({
      p_display_name: 'An Bình', p_date_of_birth: '1998-01-01', p_location_consent: false,
      p_latitude: null, p_longitude: null,
    }));
  });

  it('trusts the normalized preference result returned by the server', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: {
      ageMin: 22, ageMax: 35, distanceKm: null, preferredGenders: ['woman'], preferredLanguages: ['vi'],
    }, error: null });
    const repository = new SupabasePreferencesRepository({ rpc } as unknown as SupabaseClient);

    await expect(repository.save({
      ageMin: 22, ageMax: 35, distanceKm: 50, preferredGenders: ['woman'], preferredLanguages: ['vi'],
    })).resolves.toEqual({ ok: true, data: {
      ageMin: 22, ageMax: 35, distanceKm: null, preferredGenders: ['woman'], preferredLanguages: ['vi'],
    } });
  });

  it('uses the last saved timestamp as the next pagination cursor', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [
      { profile: publicProfile, saved_at: '2026-11-03T09:00:00Z' },
      { profile: { ...publicProfile, id: 'profile-b' }, saved_at: '2026-11-02T09:00:00Z' },
    ], error: null });
    const repository = new SupabaseSavedProfilesRepository({ rpc } as unknown as SupabaseClient);

    await expect(repository.list(undefined, 2)).resolves.toMatchObject({ ok: true, data: {
      items: [{ id: 'profile-a' }, { id: 'profile-b' }], nextCursor: '2026-11-02T09:00:00Z',
    } });
  });

  it('routes photo reordering and primary selection through server RPCs', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: [{ id: 'photo-b', storagePath: 'profile-a/b.jpg', sortOrder: 0, isPrimary: true }], error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const repository = new SupabaseProfileRepository({ rpc } as unknown as SupabaseClient);

    await expect(repository.reorderPhotos(['photo-b'])).resolves.toMatchObject({ ok: true });
    await expect(repository.setPrimaryPhoto('photo-b')).resolves.toEqual({ ok: true, data: undefined });
    expect(rpc).toHaveBeenNthCalledWith(1, 'reorder_profile_photos', { p_photo_ids: ['photo-b'] });
    expect(rpc).toHaveBeenNthCalledWith(2, 'set_primary_profile_photo', { p_photo_id: 'photo-b' });
  });
});
