import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '../auth/AuthProvider';
import { getSupabaseClient } from '../../services/supabase';
import { useAppServices } from '../../services/AppServicesProvider';
import { claimMatchCelebration } from './matchCelebrationGuard';

type Props = {
  onMatchFound: (matchId: string) => void;
  canPresentNow?: () => boolean;
};

/**
 * Listens for newly created active matches via Supabase Realtime (and foreground
 * catch-up) so User A immediately sees "It's a Match!" while actively using the app
 * when User B likes them back.
 */
export function RealtimeMatchListener({ onMatchFound, canPresentNow }: Props) {
  const { user } = useAuth();
  const services = useAppServices();
  const userId = user?.id;

  useEffect(() => {
    const client = getSupabaseClient();
    if (!userId || !client) return;

    let active = true;
    const listenStartedAtMs = Date.now() - 5_000;
    const pendingQueue: string[] = [];

    const presentOrQueue = (matchId: string) => {
      if (!active || !matchId) return;
      if (canPresentNow && !canPresentNow()) {
        if (!pendingQueue.includes(matchId)) pendingQueue.push(matchId);
        return;
      }
      if (claimMatchCelebration(matchId)) {
        onMatchFound(matchId);
      }
    };

    const flushPending = () => {
      if (!active || pendingQueue.length === 0) return;
      if (canPresentNow && !canPresentNow()) return;
      const nextId = pendingQueue.shift();
      if (nextId && claimMatchCelebration(nextId)) {
        onMatchFound(nextId);
      }
    };

    const handleMatchRecord = (row: Record<string, unknown> | null | undefined) => {
      if (!active || !row) return;
      const matchId = typeof row.id === 'string' ? row.id : '';
      const status = row.status;
      const lowId = row.user_low_id;
      const highId = row.user_high_id;
      if (!matchId || status !== 'active') return;
      if (lowId !== userId && highId !== userId) return;
      presentOrQueue(matchId);
    };

    const catchUpRecentMatches = async () => {
      if (!active || !services) return;
      const res = await services.matches.listMatches();
      if (!active || !res.ok) return;
      for (const item of res.data.items) {
        const createdMs = Date.parse(item.createdAt);
        if (!Number.isNaN(createdMs) && createdMs >= listenStartedAtMs && item.status === 'active') {
          presentOrQueue(item.id);
          break;
        }
      }
    };

    const channel = client
      .channel(`realtime-match-celebration:${userId}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload) => handleMatchRecord(payload.new as Record<string, unknown> | undefined),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload) => handleMatchRecord(payload.new as Record<string, unknown> | undefined),
      )
      .subscribe();

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void catchUpRecentMatches();
        flushPending();
      }
    });

    const flushTimer = setInterval(() => {
      if (AppState.currentState === 'active') {
        flushPending();
      }
    }, 3_000);

    const catchUpTimer = setInterval(() => {
      if (AppState.currentState === 'active') {
        void catchUpRecentMatches();
      }
    }, 15_000);

    return () => {
      active = false;
      clearInterval(flushTimer);
      clearInterval(catchUpTimer);
      appStateSub.remove();
      void client.removeChannel(channel);
    };
  }, [canPresentNow, onMatchFound, services, userId]);

  return null;
}

