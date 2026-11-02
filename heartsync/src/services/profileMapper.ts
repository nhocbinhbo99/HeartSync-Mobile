import type { ProfilePhoto, ProfilePublic } from '../shared/types/domain.types';

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | null {
  return typeof value === 'object' && value !== null ? value as RecordValue : null;
}

function string(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function parseProfilePhoto(value: unknown): ProfilePhoto | null {
  const row = record(value);
  if (!row || typeof row.id !== 'string' || typeof row.storagePath !== 'string' || typeof row.sortOrder !== 'number' || !Number.isInteger(row.sortOrder) || typeof row.isPrimary !== 'boolean') return null;
  return { id: row.id, storagePath: row.storagePath, sortOrder: row.sortOrder, isPrimary: row.isPrimary };
}

export function parseProfilePublic(value: unknown): ProfilePublic | null {
  const row = record(value);
  if (!row || typeof row.id !== 'string' || typeof row.displayName !== 'string' || typeof row.age !== 'number' || !Number.isInteger(row.age) || typeof row.gender !== 'string') return null;
  const photos = Array.isArray(row.photos) ? row.photos.map(parseProfilePhoto).filter((photo): photo is ProfilePhoto => photo !== null) : [];
  return {
    id: row.id,
    displayName: row.displayName,
    age: row.age,
    gender: row.gender,
    bio: nullableString(row.bio),
    occupation: nullableString(row.occupation),
    education: nullableString(row.education),
    publicLocation: nullableString(row.publicLocation),
    profileCompletedAt: nullableString(row.profileCompletedAt),
    photos,
    interests: Array.isArray(row.interests) ? row.interests.filter((entry): entry is string => typeof entry === 'string') : [],
    languages: Array.isArray(row.languages) ? row.languages.filter((entry): entry is string => typeof entry === 'string') : [],
  };
}

/** Converts the private/public PostgREST rows belonging to the signed-in owner. */
export function profileFromRows(profile: unknown, privateRow: unknown, photos: unknown[], interests: unknown[], languages: unknown[], age: number): ProfilePublic | null {
  const source = record(profile);
  if (!source || typeof source.id !== 'string') return null;
  return parseProfilePublic({
    id: source.id,
    displayName: string(source.display_name),
    age,
    gender: string(source.gender),
    bio: source.bio,
    occupation: source.occupation,
    education: source.education,
    publicLocation: source.public_location,
    profileCompletedAt: source.profile_completed_at,
    photos: photos.map((photo) => {
      const item = record(photo);
      return item ? { id: item.id, storagePath: item.storage_path, sortOrder: item.sort_order, isPrimary: item.is_primary } : null;
    }),
    interests: interests.map((interest) => string(record(interest)?.label)).filter(Boolean),
    languages: languages.map((language) => string(record(language)?.language_code)).filter(Boolean),
  });
}

export function recordValue(value: unknown): RecordValue | null {
  return record(value);
}
