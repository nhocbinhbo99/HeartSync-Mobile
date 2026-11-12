import { SupabaseAiAssistantRepository } from '../aiAssistantRepository';
import type { AppSupabaseClient } from '../supabase';

const requestId = '10000000-0000-4000-8000-000000000001';
const bio = 'Mình thích nhâm nhi cà phê, đọc những cuốn sách hay và dành cuối tuần cho một chuyến đi dạo thư thả để tìm thêm điều thú vị.';
const quota = { limit: 2, used: 1, remaining: 1, reset_at: null };

function clientFor(response: unknown, error: unknown = null) {
  return { functions: { invoke: jest.fn().mockResolvedValue({ data: response, error }) } } as unknown as AppSupabaseClient;
}

describe('SupabaseAiAssistantRepository', () => {
  it('calls the Edge Function for a valid Bio and parses only valid output', async () => {
    const client = clientFor({ action: 'generate_bio', request_id: requestId, suggestion: bio, quota });
    const repository = new SupabaseAiAssistantRepository(client);
    const result = await repository.generateBio({ requestId, tone: 'natural', ideas: 'Mình thích cà phê và sách.' });
    expect(result).toMatchObject({ ok: true, data: { suggestion: bio, quota: { remaining: 1 } } });
    expect(client.functions.invoke).toHaveBeenCalledWith('ai-assistant', expect.objectContaining({
      body: expect.objectContaining({ action: 'generate_bio', request_id: requestId, language: 'vi' }),
    }));
  });

  it('does not invoke the Function for invalid client input', async () => {
    const client = clientFor({});
    const result = await new SupabaseAiAssistantRepository(client).generateBio({ requestId, tone: 'natural', ideas: 'x' });
    expect(result).toMatchObject({ ok: false, error: { code: 'validation' } });
    expect(client.functions.invoke).not.toHaveBeenCalled();
  });

  it('maps a Function quota error without exposing its raw message', async () => {
    const client = clientFor(null, { context: { json: async () => ({ code: 'AI_QUOTA_EXHAUSTED', message: 'provider internals' }) } });
    const result = await new SupabaseAiAssistantRepository(client).getQuotas();
    expect(result).toMatchObject({ ok: false, error: { code: 'quota_exhausted' } });
    if (!result.ok) expect(result.error.message).not.toContain('provider internals');
  });

  it('maps provider-neutral AI errors without exposing Function internals', async () => {
    const client = clientFor(null, { context: { json: async () => ({ code: 'AI_RATE_LIMITED', message: 'provider internals' }) } });
    const result = await new SupabaseAiAssistantRepository(client).getQuotas();
    expect(result).toMatchObject({ ok: false, error: { code: 'rate_limited' } });
    if (!result.ok) expect(result.error.message).not.toContain('provider internals');
  });
});
