import { mapServiceError } from '../errors';

describe('service error mapping', () => {
  it.each([
    [{ status: 401 }, 'unauthorized'],
    [{ code: '42501' }, 'forbidden'],
    [{ code: 'PGRST116' }, 'not_found'],
    [{ code: '23505' }, 'conflict'],
    [{ code: '23514' }, 'validation'],
    [{ status: 429 }, 'rate_limited'],
    [{ message: 'Network request failed' }, 'network'],
  ] as const)('maps %p to %s', (input, code) => {
    expect(mapServiceError(input).code).toBe(code);
  });

  it('does not expose a raw provider or SQL message', () => {
    const result = mapServiceError({ code: '42501', message: 'sensitive table detail' });
    expect(result.message).not.toContain('sensitive');
  });
});
