const celebratedMatches = new Set<string>();

/**
 * Prevents opening MatchFound twice for the same match when both the swipe RPC
 * and Supabase Realtime INSERT event notify the same user milliseconds apart.
 */
export function claimMatchCelebration(matchId: string): boolean {
  if (!matchId || celebratedMatches.has(matchId)) return false;
  celebratedMatches.add(matchId);
  return true;
}

export function clearMatchCelebrationHistory(): void {
  celebratedMatches.clear();
}

