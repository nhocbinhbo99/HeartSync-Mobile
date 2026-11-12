import type { MatchRepository } from "./contracts";
import { mapServiceError } from "./errors";
import { setCachedPublicProfile } from "./photoCache";
import { parseRecordSwipeResponse } from "../shared/domain/swipe";
import { parseProfilePublic, recordValue } from "./profileMapper";
import type {
  MatchSummary,
  Page,
  Result,
  SwipeAction,
  SwipeResult,
} from "../shared/types/domain.types";
import type { AppSupabaseClient } from "./supabase";

/** All match mutations use server RPCs; the app never inserts a match itself. */
export class SupabaseMatchRepository implements MatchRepository {
  constructor(private readonly client: AppSupabaseClient) {}

  async recordSwipe(
    targetProfileId: string,
    action: SwipeAction,
  ): Promise<Result<SwipeResult>> {
    const { data, error } = await this.client.rpc("record_swipe", {
      p_target_id: targetProfileId,
      p_action: action,
    });
    if (error) return { ok: false, error: mapServiceError(error) };
    return parseRecordSwipeResponse(data);
  }

  async listMatches(cursor?: string): Promise<Result<Page<MatchSummary>>> {
    const { data, error } = await this.client.rpc("list_chat_matches", {
      p_cursor: cursor,
    });
    if (error) return { ok: false, error: mapServiceError(error) };
    const rows = Array.isArray(data) ? data : [];
    const items = rows.flatMap((row) => {
      const item = recordValue(row);
      const profile = parseProfilePublic(item?.other_profile);
      if (
        !item ||
        !profile ||
        typeof item.id !== "string" ||
        typeof item.created_at !== "string"
      )
        return [];
      setCachedPublicProfile(profile);
      return [
        {
          id: item.id,
          otherProfile: profile,
          status: "active" as const,
          createdAt: item.created_at,
          unmatchedAt: null,
          lastMessageAt:
            typeof item.last_message_at === "string"
              ? item.last_message_at
              : undefined,
          unreadCount:
            typeof item.unread_count === "number" ? item.unread_count : 0,
          lastMessagePreview:
            typeof item.last_message_preview === "string"
              ? item.last_message_preview
              : null,
        },
      ];
    });
    const lastCursor = recordValue(rows.at(-1))?.cursor_created_at;
    return {
      ok: true,
      data: {
        items,
        nextCursor:
          typeof lastCursor === "string" && rows.length === 30
            ? lastCursor
            : null,
      },
    };
  }

  async unmatch(matchId: string): Promise<Result<void>> {
    const { error } = await this.client.rpc("unmatch", { p_match_id: matchId });
    return error
      ? { ok: false, error: mapServiceError(error) }
      : { ok: true, data: undefined };
  }

  async blockUser(targetProfileId: string): Promise<Result<void>> {
    const { error } = await this.client.rpc("block_user", {
      p_target_id: targetProfileId,
    });
    return error
      ? { ok: false, error: mapServiceError(error) }
      : { ok: true, data: undefined };
  }
}
