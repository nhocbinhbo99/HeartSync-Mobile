import type { ChatMessage } from "../types/domain.types";
/** Server fields replace optimistic fields, including subsequent read receipts. */
export function dedupeMessages(messages: ChatMessage[]) {
  const result: ChatMessage[] = [];
  for (const message of messages) {
    const i = result.findIndex(
      (m) =>
        m.id === message.id ||
        (m.senderId === message.senderId &&
          m.clientMessageId === message.clientMessageId),
    );
    if (i < 0) result.push(message);
    else
      result[i] = {
        ...result[i],
        ...message,
        readAt: message.readAt ?? result[i].readAt,
      };
  }
  return result;
}
