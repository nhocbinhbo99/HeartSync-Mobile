import { dedupeMessages } from "../messages";
import type { ChatMessage } from "../../types/domain.types";
const message: ChatMessage = {
  id: "local:1",
  clientMessageId: "c1",
  senderId: "a",
  matchId: "m",
  content: "Hello",
  sentAt: "2026-11-04T00:00:00Z",
  readAt: null,
};
it("replaces optimistic data with ACK and merges read updates without duplicates", () => {
  const ack = { ...message, id: "server:1" };
  const read = { ...ack, readAt: "2026-11-04T00:01:00Z" };
  expect(dedupeMessages([message, ack, read, ack])).toEqual([read]);
});
it("does not merge distinct senders who chose the same client UUID", () => {
  expect(
    dedupeMessages([message, { ...message, id: "2", senderId: "b" }]),
  ).toHaveLength(2);
});
