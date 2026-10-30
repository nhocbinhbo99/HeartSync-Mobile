import type { ChatMessage } from '../types/domain.types';

export function dedupeMessages(messages: ChatMessage[]) {
  const seenIds = new Set<string>();
  const seenClientIds = new Set<string>();
  return messages.filter((message) => {
    if (seenIds.has(message.id) || seenClientIds.has(message.clientMessageId)) return false;
    seenIds.add(message.id);
    seenClientIds.add(message.clientMessageId);
    return true;
  });
}
