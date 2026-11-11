import { calculateAge } from '../shared/domain/age';
import { validateDiscoveryFilters } from '../shared/domain/filters';
import type {
  DiscoveryFilters,
  InterestOption,
  Page,
  ProfilePhoto,
  ProfilePrivate,
  ProfilePublic,
  ProfileSaveInput,
  Result,
} from '../shared/types/domain.types';
import type { PreferencesRepository, ProfileRepository, SavedProfilesRepository } from './contracts';
import { mapServiceError } from './errors';
import { parseProfilePhoto, parseProfilePublic, profileFromRows, recordValue } from './profileMapper';
import type { AppSupabaseClient } from './supabase';

const DEFAULT_FILTERS: DiscoveryFilters = {
  ageMin: 18,
  ageMax: 99,
  distanceKm: null,
  preferredGenders: [],
  preferredLanguages: [],
};

async function userId(client: AppSupabaseClient): Promise<Result<string>> {
  const { data, error } = await client.auth.getUser();
  return error || !data.user
    ? { ok: false, error: mapServiceError(error ?? { status: 401 }) }
    : { ok: true, data: data.user.id };
}

function parseFilters(value: unknown): DiscoveryFilters | null {
  const row = recordValue(value);
  if (!row || typeof row.ageMin !== 'number' || typeof row.ageMax !== 'number') return null;
  const filters: DiscoveryFilters = {
    ageMin: row.ageMin,
    ageMax: row.ageMax,
    distanceKm: typeof row.distanceKm === 'number' ? row.distanceKm : null,
    preferredGenders: Array.isArray(row.preferredGenders)
      ? row.preferredGenders.filter((item): item is string => typeof item === 'string')
      : [],
    preferredLanguages: Array.isArray(row.preferredLanguages)
      ? row.preferredLanguages.filter((item): item is string => typeof item === 'string')
      : [],
  };
  return validateDiscoveryFilters(filters).ok ? filters : null;
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: AppSupabaseClient) {}

  async getMine(): Promise<Result<{ public: ProfilePublic; private: ProfilePrivate }>> {
    const identity = await userId(this.client);
    if (!identity.ok) return identity;
    const [profileQuery, privateQuery, photosQuery, interestsQuery, languagesQuery] = await Promise.all([
      this.client.from('profiles').select('*').eq('id', identity.data).maybeSingle(),
      this.client.from('profile_private').select('*').eq('user_id', identity.data).maybeSingle(),
      this.client.from('profile_photos').select('*').eq('profile_id', identity.data).order('sort_order'),
      this.client.from('profile_interests').select('interests(label)').eq('profile_id', identity.data),
      this.client.from('profile_languages').select('language_code').eq('profile_id', identity.data),
    ]);
    const firstError = profileQuery.error ?? privateQuery.error ?? photosQuery.error ?? interestsQuery.error ?? languagesQuery.error;
    if (firstError) return { ok: false, error: mapServiceError(firstError) };
    if (!profileQuery.data || !privateQuery.data) {
      return { ok: false, error: { code: 'not_found', message: 'Hồ sơ của bạn chưa hoàn chỉnh.', retryable: false } };
    }
    const privateRow = recordValue(privateQuery.data);
    const dateOfBirth = typeof privateRow?.date_of_birth === 'string' ? privateRow.date_of_birth : '';
    const age = calculateAge(dateOfBirth, new Date());
    const interests = (interestsQuery.data ?? [])
      .map((entry) => recordValue(entry)?.interests)
      .map(recordValue)
      .filter((entry): entry is Record<string, unknown> => entry !== null);
    const publicProfile = profileFromRows(
      profileQuery.data,
      privateQuery.data,
      photosQuery.data ?? [],
      interests,
      languagesQuery.data ?? [],
      age ?? 0,
    );
    if (!publicProfile) {
      return { ok: false, error: { code: 'conflict', message: 'Dữ liệu hồ sơ không hợp lệ.', retryable: false } };
    }
    return {
      ok: true,
      data: {
        public: publicProfile,
        private: {
          userId: identity.data,
          dateOfBirth,
          latitude: typeof privateRow?.latitude === 'number' ? privateRow.latitude : null,
          longitude: typeof privateRow?.longitude === 'number' ? privateRow.longitude : null,
          locationConsent: privateRow?.location_consent === true,
        },
      },
    };
  }

  async getPublic(profileId: string): Promise<Result<ProfilePublic>> {
    const { data, error } = await this.client.rpc('get_public_profile', { p_profile_id: profileId });
    if (error) return { ok: false, error: mapServiceError(error) };
    const profile = parseProfilePublic(data);
    return profile
      ? { ok: true, data: profile }
      : { ok: false, error: { code: 'conflict', message: 'Máy chủ trả về hồ sơ không hợp lệ.', retryable: false } };
  }

  async listInterests(): Promise<Result<InterestOption[]>> {
    const { data, error } = await this.client.from('interests').select('id,slug,label').order('label');
    if (error) return { ok: false, error: mapServiceError(error) };
    const interests = (data ?? []).flatMap((entry) => {
      const row = recordValue(entry);
      return row && typeof row.id === 'string' && typeof row.slug === 'string' && typeof row.label === 'string'
        ? [{ id: row.id, slug: row.slug, label: row.label }]
        : [];
    });
    return { ok: true, data: interests };
  }

  async save(input: ProfileSaveInput): Promise<Result<{ public: ProfilePublic; private: ProfilePrivate }>> {
    const identity = await userId(this.client);
    if (!identity.ok) return identity;
    const { data, error } = await this.client.rpc('save_my_profile', {
      p_display_name: input.displayName.trim(),
      p_gender: input.gender,
      p_date_of_birth: input.dateOfBirth,
      p_bio: input.bio ?? undefined,
      p_occupation: input.occupation ?? undefined,
      p_education: input.education ?? undefined,
      p_public_location: input.publicLocation ?? undefined,
      p_interest_labels: input.interests,
      p_languages: input.languages,
      p_location_consent: input.locationConsent,
      p_latitude: input.locationConsent ? input.latitude ?? undefined : undefined,
      p_longitude: input.locationConsent ? input.longitude ?? undefined : undefined,
    });
    if (error) return { ok: false, error: mapServiceError(error) };
    const profile = parseProfilePublic(data);
    if (!profile) {
      return { ok: false, error: { code: 'conflict', message: 'Máy chủ đã lưu nhưng trả về hồ sơ không hợp lệ.', retryable: false } };
    }
    return {
      ok: true,
      data: {
        public: profile,
        private: {
          userId: identity.data,
          dateOfBirth: input.dateOfBirth,
          locationConsent: input.locationConsent,
          latitude: input.locationConsent ? input.latitude : null,
          longitude: input.locationConsent ? input.longitude : null,
        },
      },
    };
  }

  async uploadPhoto(sourceUri: string, sortOrder: number): Promise<Result<ProfilePhoto>> {
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 5) {
      return { ok: false, error: { code: 'validation', message: 'Chỉ được tối đa sáu ảnh hồ sơ.', retryable: false } };
    }
    const identity = await userId(this.client);
    if (!identity.ok) return identity;
    try {
      const response = await fetch(sourceUri);
      if (!response.ok) throw new Error('photo_read_failed');
      const body = await response.arrayBuffer();
      const path = `${identity.data}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const upload = await this.client.storage.from('profile-photos').upload(path, body, {
        contentType: 'image/jpeg',
        upsert: false,
      });
      if (upload.error) return { ok: false, error: mapServiceError(upload.error) };
      const insert = await this.client.from('profile_photos').insert({
        profile_id: identity.data,
        storage_path: path,
        sort_order: sortOrder,
        is_primary: sortOrder === 0,
      }).select('*').single();
      if (insert.error) {
        await this.client.storage.from('profile-photos').remove([path]);
        return { ok: false, error: mapServiceError(insert.error) };
      }
      const photo = parseProfilePhoto({
        id: insert.data.id,
        storagePath: insert.data.storage_path,
        sortOrder: insert.data.sort_order,
        isPrimary: insert.data.is_primary,
      });
      return photo
        ? { ok: true, data: photo }
        : { ok: false, error: { code: 'conflict', message: 'Ảnh đã tải lên nhưng dữ liệu trả về không hợp lệ.', retryable: false } };
    } catch (error) {
      return { ok: false, error: mapServiceError(error) };
    }
  }

  async deletePhoto(photo: ProfilePhoto): Promise<Result<void>> {
    const metadata = await this.client.from('profile_photos').delete().eq('id', photo.id);
    if (metadata.error) return { ok: false, error: mapServiceError(metadata.error) };
    const file = await this.client.storage.from('profile-photos').remove([photo.storagePath]);
    return file.error ? { ok: false, error: mapServiceError(file.error) } : { ok: true, data: undefined };
  }

  async reorderPhotos(photoIds: string[]): Promise<Result<ProfilePhoto[]>> {
    const { data, error } = await this.client.rpc('reorder_profile_photos', { p_photo_ids: photoIds });
    if (error) return { ok: false, error: mapServiceError(error) };
    if (!Array.isArray(data)) {
      return { ok: false, error: { code: 'conflict', message: 'Máy chủ trả về thứ tự ảnh không hợp lệ.', retryable: false } };
    }
    const photos = data.map(parseProfilePhoto).filter((photo): photo is ProfilePhoto => photo !== null);
    return photos.length === data.length
      ? { ok: true, data: photos }
      : { ok: false, error: { code: 'conflict', message: 'Máy chủ trả về thứ tự ảnh không hợp lệ.', retryable: false } };
  }

  async setPrimaryPhoto(photoId: string): Promise<Result<void>> {
    const { error } = await this.client.rpc('set_primary_profile_photo', { p_photo_id: photoId });
    return error ? { ok: false, error: mapServiceError(error) } : { ok: true, data: undefined };
  }

  async createPhotoUrl(storagePath: string): Promise<Result<string>> {
    const { data, error } = await this.client.storage.from('profile-photos').createSignedUrl(storagePath, 60 * 60);
    return error || !data?.signedUrl
      ? { ok: false, error: mapServiceError(error ?? { status: 404 }) }
      : { ok: true, data: data.signedUrl };
  }
}

export class SupabasePreferencesRepository implements PreferencesRepository {
  constructor(private readonly client: AppSupabaseClient) {}

  async get(): Promise<Result<DiscoveryFilters>> {
    const identity = await userId(this.client);
    if (!identity.ok) return identity;
    const { data, error } = await this.client.from('user_preferences').select('*').eq('user_id', identity.data).maybeSingle();
    if (error) return { ok: false, error: mapServiceError(error) };
    if (!data) return { ok: true, data: DEFAULT_FILTERS };
    const filters: DiscoveryFilters = {
      ageMin: data.age_min,
      ageMax: data.age_max,
      distanceKm: data.distance_km,
      preferredGenders: data.preferred_genders ?? [],
      preferredLanguages: data.preferred_languages ?? [],
    };
    const checked = validateDiscoveryFilters(filters);
    return checked.ok ? checked : { ok: false, error: checked.error };
  }

  async save(filters: DiscoveryFilters): Promise<Result<DiscoveryFilters>> {
    const checked = validateDiscoveryFilters(filters);
    if (!checked.ok) return checked;
    const { data, error } = await this.client.rpc('save_my_preferences', {
      p_age_min: checked.data.ageMin,
      p_age_max: checked.data.ageMax,
      p_distance_km: checked.data.distanceKm ?? undefined,
      p_preferred_genders: checked.data.preferredGenders,
      p_preferred_languages: checked.data.preferredLanguages,
    });
    if (error) return { ok: false, error: mapServiceError(error) };
    const parsed = parseFilters(data);
    return parsed
      ? { ok: true, data: parsed }
      : { ok: false, error: { code: 'conflict', message: 'Máy chủ trả về bộ lọc không hợp lệ.', retryable: false } };
  }
}

export class SupabaseSavedProfilesRepository implements SavedProfilesRepository {
  constructor(private readonly client: AppSupabaseClient) {}

  async list(cursor?: string, limit = 20): Promise<Result<Page<ProfilePublic>>> {
    const { data, error } = await this.client.rpc('list_saved_profiles', {
      p_limit: limit,
      p_cursor_created_at: cursor,
    });
    if (error) return { ok: false, error: mapServiceError(error) };
    const rows = Array.isArray(data) ? data : [];
    const items = rows.flatMap((entry) => {
      const row = recordValue(entry);
      const profile = parseProfilePublic(row?.profile);
      return profile ? [profile] : [];
    });
    if (items.length !== rows.length) {
      return { ok: false, error: { code: 'conflict', message: 'Danh sách đã lưu không hợp lệ.', retryable: false } };
    }
    const last = recordValue(rows.at(-1));
    return {
      ok: true,
      data: {
        items,
        nextCursor: rows.length === limit && typeof last?.saved_at === 'string' ? last.saved_at : null,
      },
    };
  }

  async isSaved(targetProfileId: string): Promise<Result<boolean>> {
    const identity = await userId(this.client);
    if (!identity.ok) return identity;
    const { data, error } = await this.client.from('saved_profiles').select('target_id')
      .eq('owner_id', identity.data).eq('target_id', targetProfileId).maybeSingle();
    return error ? { ok: false, error: mapServiceError(error) } : { ok: true, data: data !== null };
  }

  async setSaved(targetProfileId: string, saved: boolean): Promise<Result<void>> {
    const identity = await userId(this.client);
    if (!identity.ok) return identity;
    if (saved) {
      const { error } = await this.client.from('saved_profiles').upsert(
        { owner_id: identity.data, target_id: targetProfileId },
        { onConflict: 'owner_id,target_id', ignoreDuplicates: true },
      );
      return error ? { ok: false, error: mapServiceError(error) } : { ok: true, data: undefined };
    }
    const { error } = await this.client.from('saved_profiles').delete()
      .eq('owner_id', identity.data).eq('target_id', targetProfileId);
    return error ? { ok: false, error: mapServiceError(error) } : { ok: true, data: undefined };
  }
}
