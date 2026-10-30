import { validateDiscoveryFilters } from '../filters';

const valid = {
  ageMin: 18,
  ageMax: 35,
  distanceKm: 25,
  preferredGenders: ['woman'],
  preferredLanguages: ['vi'],
};

describe('discovery filter invariants', () => {
  it('accepts a valid range', () => {
    expect(validateDiscoveryFilters(valid)).toEqual({ ok: true, data: valid });
  });

  it.each([
    { ...valid, ageMin: 17 },
    { ...valid, ageMin: 36 },
    { ...valid, ageMax: 121 },
    { ...valid, distanceKm: 0 },
    { ...valid, distanceKm: 501 },
    { ...valid, distanceKm: 2.5 },
  ])('rejects unsafe ranges: %p', (filters) => {
    expect(validateDiscoveryFilters(filters).ok).toBe(false);
  });
});
