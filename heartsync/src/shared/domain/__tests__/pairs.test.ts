import { canonicalUserPair } from '../pairs';

describe('canonical match pair', () => {
  it('orders both input directions identically', () => {
    expect(canonicalUserPair('user-b', 'user-a')).toEqual(['user-a', 'user-b']);
    expect(canonicalUserPair('user-a', 'user-b')).toEqual(['user-a', 'user-b']);
  });

  it('rejects self-pairs and blank IDs', () => {
    expect(canonicalUserPair('user-a', 'user-a')).toBeNull();
    expect(canonicalUserPair('', 'user-b')).toBeNull();
  });
});
