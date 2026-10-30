import type { DiscoveryFilters, Result } from '../types/domain.types';

export function validateDiscoveryFilters(filters: DiscoveryFilters): Result<DiscoveryFilters> {
  if (!Number.isInteger(filters.ageMin) || !Number.isInteger(filters.ageMax) || filters.ageMin < 18 || filters.ageMax > 120 || filters.ageMin > filters.ageMax) {
    return { ok: false, error: { code: 'validation', message: 'Khoảng tuổi phải từ 18 đến 120 và theo thứ tự tăng dần.', retryable: false } };
  }
  if (filters.distanceKm !== null && (!Number.isInteger(filters.distanceKm) || filters.distanceKm < 1 || filters.distanceKm > 500)) {
    return { ok: false, error: { code: 'validation', message: 'Khoảng cách phải từ 1 đến 500 km.', retryable: false } };
  }
  return { ok: true, data: filters };
}
