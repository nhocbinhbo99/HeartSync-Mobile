import type { SupabaseClient } from '@supabase/supabase-js';

import { calculateAge } from '../shared/domain/age';
import type { DiscoveryFilters, Page, ProfilePhoto, ProfilePrivate, ProfilePublic, Result } from '../shared/types/domain.types';
import type { PreferencesRepository, ProfileRepository, SavedProfilesRepository } from './contracts';
import { mapServiceError } from './errors';
import { parseProfilePhoto, parseProfilePublic, profileFromRows, recordValue } from './profileMapper';

const DEFAULT_FILTERS: DiscoveryFilters = { ageMin: 18, ageMax: 99, distanceKm: null, preferredGenders: [], preferredLanguages: [] };

async function userId(client: SupabaseClient): Promise<Result<string>> {
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? { ok: false, error: mapServiceError(error ?? { status: 401 }) } : { ok: true, data: data.user.id };
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

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
    if (!profileQuery.data || !privateQuery.data) return { ok: false, error: { code: 'not_found', message: 'Hồ sơ của bạn chưa hoàn chỉnh.', retryable: false } };
    const privateRow = recordValue(privateQuery.data);
    const dateOfBirth = typeof privateRow?.date_of_birth === 'string' ? privateRow.date_of_birth : '';
    const age = calculateAge(dateOfBirth, new Date());
    const interests = (interestsQuery.data ?? []).map((entry) => recordValue(entry)?.interests).map(recordValue).filter((entry): entry is Record<string, unknown> => entry !== null);
    const publicProfile = profileFromRows(profileQuery.data, privateQuery.data, photosQuery.data ?? [], interests, languagesQuery.data ?? [], age ?? 0);
    if (!publicProfile) return { ok: false, error: { code: 'conflict', message: 'Dữ liệu hồ sơ không hợp lệ.', retryable: false } };
    return { ok: true, data: { public: publicProfile, private: {
      userId: identity.data,
      dateOfBirth,
      latitude: typeof privateRow?.latitude === 'number' ? privateRow.latitude : null,
      longitude: typeof privateRow?.longitude === 'number' ? privateRow.longitude : null,
      locationConsent: privateRow?.location_consent === true,
    } } };
  }

  async getPublic(profileId: string): Promise<Result<ProfilePublic>> {
    const { data, error } = await this.client.rpc('get_public_profile', { p_profile_id: profileId });
    if (error) return { ok: false, error: mapServiceError(error) };
    const profile = parseProfilePublic(data);
    return profile ? { ok: true, data: profile } : { ok: false, error: { code: 'conflict', message: 'Máy chủ trả về hồ sơ không hợp lệ.', retryable: false } };
  }

  async savePublic(profile: ProfilePublic): Promise<Result<ProfilePublic>> {
    const { error } = await this.client.from('profiles').upsert({
      id: profile.id, display_name: profile.displayName.trim(), gender: profile.gender.trim(), bio: profile.bio,
      occupation: profile.occupation, education: profile.education, public_location: profile.publicLocation,
      profile_completed_at: profile.profileCompletedAt,
    });
    if (error) return { ok: false, error: mapServiceError(error) };
    const { data: interests, error: interestsError } = await this.client.from('interests').select('id,label').in('label', profile.interests);
    if (interestsError) return { ok: false, error: mapServiceError(interestsError) };
    const removeInterests = await this.client.from('profile_interests').delete().eq('profile_id', profile.id);
    if (removeInterests.error) return { ok: false, error: mapServiceError(removeInterests.error) };
    if ((interests ?? []).length) {
      const inserted = await this.client.from('profile_interests').insert((interests ?? []).map((interest) => ({ profile_id: profile.id, interest_id: interest.id })));
      if (inserted.error) return { ok: false, error: mapServiceError(inserted.error) };
    }
    const removeLanguages = await this.client.from('profile_languages').delete().eq('profile_id', profile.id);
    if (removeLanguages.error) return { ok: false, error: mapServiceError(removeLanguages.error) };
    if (profile.languages.length) {
      const inserted = await this.client.from('profile_languages').insert(profile.languages.map((language) => ({ profile_id: profile.id, language_code: language })));
      if (inserted.error) return { ok: false, error: mapServiceError(inserted.error) };
    }
    return { ok: true, data: profile };
  }

  async savePrivate(profile: ProfilePrivate): Promise<Result<ProfilePrivate>> {
    const { error } = await this.client.from('profile_private').upsert({
      user_id: profile.userId, date_of_birth: profile.dateOfBirth, latitude: profile.latitude,
      longitude: profile.longitude, location_consent: profile.locationConsent,
      location_updated_at: profile.locationConsent && profile.latitude !== null ? new Date().toISOString() : null,
    });
    return error ? { ok: false, error: mapServiceError(error) } : { ok: true, data: profile };
  }

  async uploadPhoto(profileId: string, sourceUri: string, sortOrder: number): Promise<Result<ProfilePhoto>> {
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 5) return { ok: false, error: { code: 'validation', message: 'Chỉ được tối đa sáu ảnh hồ sơ.', retryable: false } };
    try {
      const response = await fetch(sourceUri);
      const body = await response.arrayBuffer();
      const path = `${profileId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const upload = await this.client.storage.from('profile-photos').upload(path, body, { contentType: 'image/jpeg', upsert: false });
      if (upload.error) return { ok: false, error: mapServiceError(upload.error) };
      const insert = await this.client.from('profile_photos').insert({ profile_id: profileId, storage_path: path, sort_order: sortOrder, is_primary: sortOrder === 0 }).select('*').single();
      if (insert.error) {
        await this.client.storage.from('profile-photos').remove([path]);
        return { ok: false, error: mapServiceError(insert.error) };
      }
      const photo = parseProfilePhoto({ id: insert.data.id, storagePath: insert.data.storage_path, sortOrder: insert.data.sort_order, isPrimary: insert.data.is_primary });
      return photo ? { ok: true, data: photo } : { ok: false, error: { code: 'conflict', message: 'Ảnh đã tải lên nhưng dữ liệu trả về không hợp lệ.', retryable: false } };
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

  async createPhotoUrl(storagePath: string): Promise<Result<string>> {
    const { data, error } = await this.client.storage.from('profile-photos').createSignedUrl(storagePath, 60 * 60);
    return error || !data?.signedUrl ? { ok: false, error: mapServiceError(error ?? { status: 404 }) } : { ok: true, data: data.signedUrl };
  }
}

export class SupabasePreferencesRepository implements PreferencesRepository {
  constructor(private readonly client: SupabaseClient) {}
  async get(): Promise<Result<DiscoveryFilters>> {
    const identity = await userId(this.client);
    if (!identity.ok) return identity;
    const { data, error } = await this.client.from('user_preferences').select('*').eq('user_id', identity.data).maybeSingle();
    if (error) return { ok: false, error: mapServiceError(error) };
    if (!data) return { ok: true, data: DEFAULT_FILTERS };
    return { ok: true, data: { ageMin: data.age_min, ageMax: data.age_max, distanceKm: data.distance_km, preferredGenders: data.preferred_genders ?? [], preferredLanguages: data.preferred_languages ?? [] } };
  }
  async save(filters: DiscoveryFilters): Promise<Result<DiscoveryFilters>> {
    const identity = await userId(this.client);
    if (!identity.ok) return identity;
    const { error } = await this.client.from('user_preferences').upsert({ user_id: identity.data, age_min: filters.ageMin, age_max: filters.ageMax, distance_km: filters.distanceKm, preferred_genders: filters.preferredGenders, preferred_languages: filters.preferredLanguages });
    return error ? { ok: false, error: mapServiceError(error) } : { ok: true, data: filters };
  }
}

export class SupabaseSavedProfilesRepository implements SavedProfilesRepository {
  constructor(private readonly client: SupabaseClient, private readonly profiles: ProfileRepository) {}
  async list(_cursor?: string): Promise<Result<Page<ProfilePublic>>> {
    const { data, error } = await this.client.from('saved_profiles').select('target_id').order('created_at', { ascending: false });
    if (error) return { ok: false, error: mapServiceError(error) };
    const profiles = await Promise.all((data ?? []).map((entry) => this.profiles.getPublic(entry.target_id)));
    return { ok: true, data: { items: profiles.flatMap((entry) => entry.ok ? [entry.data] : []), nextCursor: null } };
  }
  async setSaved(targetProfileId: string, saved: boolean): Promise<Result<void>> {
    const identity = await userId(this.client);
    if (!identity.ok) return identity;
    if (saved) {
      const { error } = await this.client.from('saved_profiles').upsert({ owner_id: identity.data, target_id: targetProfileId });
      return error ? { ok: false, error: mapServiceError(error) } : { ok: true, data: undefined };
    }
    const { error } = await this.client.from('saved_profiles').delete().eq('owner_id', identity.data).eq('target_id', targetProfileId);
    return error ? { ok: false, error: mapServiceError(error) } : { ok: true, data: undefined };
  }
}
