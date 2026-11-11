import { Image } from 'react-native';

import {
  clearAllAppCaches,
  getCachedPhotoUrl,
  getCachedPublicProfile,
  invalidatePhotoUrl,
  resolvePhotoUrls,
  setCachedPhotoUrl,
  setCachedPublicProfile,
} from '../photoCache';
import type { ProfilePublic } from '../../shared/types/domain.types';

describe('photoCache', () => {
  beforeEach(() => {
    clearAllAppCaches();
    jest.restoreAllMocks();
  });

  it('caches signed URLs across lookups and clears cleanly on sign-out', async () => {
    jest.spyOn(Image, 'prefetch').mockResolvedValue(true);
    const createPhotoUrls = jest.fn(async (paths: string[]) =>
      Object.fromEntries(paths.map((p) => [p, `https://cdn.example.com/${p}?token=abc`])),
    );
    const createPhotoUrl = jest.fn();

    const first = await resolvePhotoUrls({ createPhotoUrl, createPhotoUrls }, ['u1/a.jpg', 'u2/b.jpg', 'u1/a.jpg']);
    expect(createPhotoUrls).toHaveBeenCalledTimes(1);
    expect(createPhotoUrls).toHaveBeenCalledWith(['u1/a.jpg', 'u2/b.jpg']);
    expect(first['u1/a.jpg']).toBe('https://cdn.example.com/u1/a.jpg?token=abc');
    expect(getCachedPhotoUrl('u2/b.jpg')).toBe('https://cdn.example.com/u2/b.jpg?token=abc');

    const second = await resolvePhotoUrls({ createPhotoUrl, createPhotoUrls }, ['u1/a.jpg', 'u2/b.jpg']);
    expect(createPhotoUrls).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);

    invalidatePhotoUrl('u1/a.jpg');
    expect(getCachedPhotoUrl('u1/a.jpg')).toBeUndefined();
    expect(getCachedPhotoUrl('u2/b.jpg')).toBeDefined();

    clearAllAppCaches();
    expect(getCachedPhotoUrl('u2/b.jpg')).toBeUndefined();
  });

  it('caches public profiles briefly and clears them on sign-out', () => {
    const profile: ProfilePublic = {
      id: 'p-1',
      displayName: 'Ngọc Anh',
      age: 22,
      gender: 'woman',
      bio: null,
      occupation: null,
      education: null,
      publicLocation: 'TP. Hồ Chí Minh',
      profileCompletedAt: '2026-11-11T00:00:00Z',
      photos: [],
      interests: [],
      languages: ['vi'],
    };

    setCachedPhotoUrl('p-1/main.jpg', 'https://cdn.example.com/p-1/main.jpg?token=xyz');
    setCachedPublicProfile(profile);
    expect(getCachedPublicProfile('p-1')?.displayName).toBe('Ngọc Anh');

    clearAllAppCaches();
    expect(getCachedPublicProfile('p-1')).toBeUndefined();
    expect(getCachedPhotoUrl('p-1/main.jpg')).toBeUndefined();
  });
});

