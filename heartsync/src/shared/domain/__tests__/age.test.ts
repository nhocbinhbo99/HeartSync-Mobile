import { calculateAge, isAdult } from '../age';

describe('adult eligibility', () => {
  const today = new Date('2026-10-30T00:00:00.000Z');

  it('accepts a user on their 18th birthday', () => {
    expect(calculateAge('2008-10-30', today)).toBe(18);
    expect(isAdult('2008-10-30', today)).toBe(true);
  });

  it('rejects under-18 and invalid dates', () => {
    expect(isAdult('2008-10-31', today)).toBe(false);
    expect(isAdult('2008-02-30', today)).toBe(false);
    expect(isAdult('not-a-date', today)).toBe(false);
  });
});
