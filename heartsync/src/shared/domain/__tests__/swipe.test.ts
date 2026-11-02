import { parseRecordSwipeResponse } from '../swipe';

describe('recordSwipe result parsing', () => {
  it.each(['liked', 'passed'] as const)('accepts %s only without a match ID', (outcome) => {
    expect(parseRecordSwipeResponse([{ outcome, match_id: null }])).toEqual({
      ok: true,
      data: { outcome, matchId: null },
    });
  });

  it('accepts a server-confirmed match', () => {
    expect(parseRecordSwipeResponse({ outcome: 'matched', match_id: 'match-1' })).toEqual({
      ok: true,
      data: { outcome: 'matched', matchId: 'match-1' },
    });
  });

  it.each([
    { outcome: 'matched', match_id: null },
    { outcome: 'liked', match_id: 'phantom-match' },
    { outcome: 'unknown', match_id: null },
    [],
    null,
  ])('rejects phantom or malformed matches: %p', (value) => {
    expect(parseRecordSwipeResponse(value).ok).toBe(false);
  });
});
