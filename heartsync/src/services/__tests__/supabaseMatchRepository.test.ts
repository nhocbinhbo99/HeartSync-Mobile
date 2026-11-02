import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseMatchRepository } from '../supabaseMatchRepository';

describe('SupabaseMatchRepository', () => {
  it('uses the atomic record_swipe RPC and trusts only its confirmed result', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [{ outcome: 'matched', match_id: 'match-1' }], error: null });
    const repository = new SupabaseMatchRepository({ rpc } as unknown as SupabaseClient);

    await expect(repository.recordSwipe('target-1', 'like')).resolves.toEqual({
      ok: true,
      data: { outcome: 'matched', matchId: 'match-1' },
    });
    expect(rpc).toHaveBeenCalledWith('record_swipe', { p_target_id: 'target-1', p_action: 'like' });
  });

  it('rejects a phantom match returned without a match ID', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [{ outcome: 'matched', match_id: null }], error: null });
    const repository = new SupabaseMatchRepository({ rpc } as unknown as SupabaseClient);
    await expect(repository.recordSwipe('target-1', 'like')).resolves.toMatchObject({ ok: false });
  });
});
