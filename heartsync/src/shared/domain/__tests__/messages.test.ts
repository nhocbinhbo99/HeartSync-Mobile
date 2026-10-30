import { dedupeMessages } from '../messages';
import type { ChatMessage } from '../../types/domain.types';

const message = (id: string, clientMessageId: string): ChatMessage => ({
  id,
  clientMessageId,
  matchId: 'match-1',
  senderId: 'user-a',
  content: 'Xin chào',
  sentAt: '2026-10-30T00:00:00.000Z',
  readAt: null,
});

describe('message dedupe', () => {
  it('deduplicates server IDs and optimistic client IDs while keeping order', () => {
    const messages = [message('1', 'c1'), message('1', 'c2'), message('2', 'c1'), message('3', 'c3')];
    expect(dedupeMessages(messages)).toEqual([messages[0], messages[3]]);
  });
});
