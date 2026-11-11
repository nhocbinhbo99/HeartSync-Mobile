import {
  isValidBioSuggestion,
  isValidIcebreakerSuggestions,
  mapAiServerError,
  parseAiBioGeneration,
  parseAiIcebreakerGeneration,
  parseAiQuotas,
  validateAiBioInput,
  validateAiIcebreakerInput,
} from '../ai';

const requestId = '10000000-0000-4000-8000-000000000001';
const matchId = '20000000-0000-4000-8000-000000000001';
const quota = { limit: 2, used: 1, remaining: 1, reset_at: null };
const bio = 'Mình thích nhâm nhi cà phê, đọc những cuốn sách hay và dành cuối tuần cho một chuyến đi dạo thư thả để tìm thêm điều thú vị.';
const icebreakers: [string, string, string] = [
  'Nếu có một buổi cà phê lý tưởng, bạn sẽ chọn góc ngồi và đồ uống như thế nào?',
  'Cuối tuần này bạn thích khám phá một nơi mới hay thư giãn với một cuốn sách hơn?',
  'Chào bạn, có bộ phim nào gần đây xem xong khiến bạn muốn kể lại ngay không?',
];

describe('AI request and response validation', () => {
  it('accepts a valid Bio request and 80–300 character suggestion', () => {
    expect(validateAiBioInput({ requestId, tone: 'natural', ideas: 'Mình thích cà phê, đọc sách và đi dạo.' })).toBeNull();
    expect(isValidBioSuggestion(bio)).toBe(true);
    expect(parseAiBioGeneration({ action: 'generate_bio', request_id: requestId, suggestion: bio, quota })).toEqual({
      requestId, suggestion: bio, quota: { limit: 2, used: 1, remaining: 1, resetAt: null },
    });
  });

  it.each(['', 'hi', 'x'.repeat(801)])('rejects invalid Bio ideas', (ideas) => {
    expect(validateAiBioInput({ requestId, tone: 'natural', ideas })).not.toBeNull();
  });

  it('requires exactly three distinct, usable Icebreakers', () => {
    expect(validateAiIcebreakerInput({ requestId, matchId, tone: 'friendly' })).toBeNull();
    expect(isValidIcebreakerSuggestions(icebreakers)).toBe(true);
    expect(parseAiIcebreakerGeneration({
      action: 'generate_icebreaker', request_id: requestId, suggestions: icebreakers,
      quota: { ...quota, reset_at: '2026-11-12T00:00:00+07:00' },
    })?.suggestions).toEqual(icebreakers);
  });

  const malformedOutputs: unknown[] = [
    [],
    [icebreakers[0], icebreakers[1]],
    [icebreakers[0], icebreakers[1], icebreakers[2], icebreakers[0]],
    [icebreakers[0], icebreakers[0], icebreakers[2]],
    ['Câu quá ngắn?', icebreakers[1], icebreakers[2]],
  ];
  it.each(malformedOutputs.map((suggestions) => [suggestions]))('rejects malformed Icebreaker output', (suggestions) => {
    expect(isValidIcebreakerSuggestions(suggestions)).toBe(false);
  });

  it('does not accept a malformed quota payload', () => {
    expect(parseAiQuotas({ profile_bio: quota, icebreaker: { ...quota, limit: 3 } })).toBeNull();
  });

  it('maps safe server codes without preserving provider messages', () => {
    expect(mapAiServerError({ code: 'AI_QUOTA_EXHAUSTED', message: 'sensitive provider text' })?.code).toBe('quota_exhausted');
    expect(mapAiServerError({ code: 'GEMINI_RATE_LIMITED' })?.retryable).toBe(true);
  });
});
