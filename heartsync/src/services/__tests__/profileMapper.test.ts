import { parseProfilePublic } from '../profileMapper';

describe('public profile mapper', () => {
  const valid = {
    id: 'profile-1', displayName: 'An', age: 24, gender: 'woman', bio: null,
    occupation: null, education: null, publicLocation: 'TP.HCM', profileCompletedAt: null,
    photos: [{ id: 'photo-1', storagePath: 'profile-1/p.jpg', sortOrder: 0, isPrimary: true }],
    interests: ['Âm nhạc'], languages: ['vi'],
  };

  it('maps only the approved public projection', () => {
    expect(parseProfilePublic({ ...valid, dateOfBirth: '2001-01-01', latitude: 10.7, email: 'private@example.test' }))
      .toEqual(valid);
  });

  it('rejects malformed required data', () => {
    expect(parseProfilePublic({ ...valid, age: '24' })).toBeNull();
  });
});
