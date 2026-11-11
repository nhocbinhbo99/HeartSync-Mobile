import { Image } from 'react-native';

import type { ProfilePublic, Result } from '../shared/types/domain.types';
import type { ProfileRepository } from './contracts';

const PHOTO_URL_TTL_MS = 45 * 60 * 1000;
const PUBLIC_PROFILE_TTL_MS = 3 * 60 * 1000;

type CachedUrlEntry = { url: string; expiresAt: number };
type CachedProfileEntry = { profile: ProfilePublic; expiresAt: number };

const photoUrlCache = new Map<string, CachedUrlEntry>();
const inFlightPhotoUrls = new Map<string, Promise<Result<string>>>();
const prefetchedUrls = new Set<string>();
const publicProfileCache = new Map<string, CachedProfileEntry>();

export function getCachedPhotoUrl(storagePath?: string | null): string | undefined {
  if (!storagePath) return undefined;
  const entry = photoUrlCache.get(storagePath);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    photoUrlCache.delete(storagePath);
    return undefined;
  }
  return entry.url;
}

export function setCachedPhotoUrl(storagePath: string, url: string): void {
  if (!storagePath || !url) return;
  photoUrlCache.set(storagePath, { url, expiresAt: Date.now() + PHOTO_URL_TTL_MS });
  prefetchImageUrls([url]);
}

export function invalidatePhotoUrl(storagePath: string): void {
  const existing = photoUrlCache.get(storagePath);
  if (existing) prefetchedUrls.delete(existing.url);
  photoUrlCache.delete(storagePath);
  inFlightPhotoUrls.delete(storagePath);
}

export function getInFlightPhotoUrl(storagePath: string): Promise<Result<string>> | undefined {
  return inFlightPhotoUrls.get(storagePath);
}

export function setInFlightPhotoUrl(storagePath: string, promise: Promise<Result<string>>): void {
  inFlightPhotoUrls.set(storagePath, promise);
  void promise.finally(() => {
    if (inFlightPhotoUrls.get(storagePath) === promise) {
      inFlightPhotoUrls.delete(storagePath);
    }
  });
}

export function prefetchImageUrls(urls: readonly (string | null | undefined)[]): void {
  if (typeof Image?.prefetch !== 'function') return;
  for (const url of urls) {
    if (!url || prefetchedUrls.has(url)) continue;
    prefetchedUrls.add(url);
    try {
      void Promise.resolve(Image.prefetch(url)).catch(() => {
        prefetchedUrls.delete(url);
      });
    } catch {
      prefetchedUrls.delete(url);
    }
  }
}

export function getCachedPublicProfile(profileId?: string | null): ProfilePublic | undefined {
  if (!profileId) return undefined;
  const entry = publicProfileCache.get(profileId);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    publicProfileCache.delete(profileId);
    return undefined;
  }
  return entry.profile;
}

export function setCachedPublicProfile(profile: ProfilePublic): void {
  if (!profile?.id) return;
  publicProfileCache.set(profile.id, {
    profile,
    expiresAt: Date.now() + PUBLIC_PROFILE_TTL_MS,
  });
}

export async function resolvePhotoUrls(
  profileRepo: Pick<ProfileRepository, 'createPhotoUrl'> & {
    createPhotoUrls?: (paths: string[]) => Promise<Record<string, string>>;
  },
  storagePaths: readonly (string | null | undefined)[],
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  const uncached: string[] = [];
  const seen = new Set<string>();

  for (const path of storagePaths) {
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const cached = getCachedPhotoUrl(path);
    if (cached) {
      resolved[path] = cached;
    } else {
      uncached.push(path);
    }
  }

  if (uncached.length === 0) return resolved;

  if (typeof profileRepo.createPhotoUrls === 'function') {
    const batch = await profileRepo.createPhotoUrls(uncached);
    for (const [path, url] of Object.entries(batch)) {
      if (url) {
        setCachedPhotoUrl(path, url);
        resolved[path] = url;
      }
    }
    return resolved;
  }

  const entries = await Promise.all(
    uncached.map(async (path) => {
      const result = await profileRepo.createPhotoUrl(path);
      return result.ok ? ([path, result.data] as const) : null;
    }),
  );
  for (const entry of entries) {
    if (entry) {
      setCachedPhotoUrl(entry[0], entry[1]);
      resolved[entry[0]] = entry[1];
    }
  }
  return resolved;
}

export function clearAllAppCaches(): void {
  photoUrlCache.clear();
  inFlightPhotoUrls.clear();
  prefetchedUrls.clear();
  publicProfileCache.clear();
}

