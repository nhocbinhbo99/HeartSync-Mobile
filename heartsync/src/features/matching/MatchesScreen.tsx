import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthProvider';
import { useAppServices } from '../../services/AppServicesProvider';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { Avatar } from '../../shared/components/Avatar';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, fonts, radii, spacing, type } from '../../shared/theme/tokens';
import type { IncomingCall, MatchSummary, ProfilePublic } from '../../shared/types/domain.types';
import { getFallbackAvatar } from '../../shared/utils/avatarHelper';
import { feedback } from '../../shared/motion/feedback';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Matches'>,
  NativeStackScreenProps<RootStackParamList>
>;
type PhotoUrls = Record<string, string>;
type MatchFilter = 'all' | 'chats' | 'new';

function connectedAt(createdAt: string) {
  const timestamp = new Date(createdAt).getTime();
  if (Number.isNaN(timestamp)) return 'Đã kết nối';
  const elapsedHours = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));
  if (elapsedHours < 1) return 'Vừa kết nối';
  if (elapsedHours < 24) return `${elapsedHours} giờ trước`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) return 'Hôm qua';
  return `${elapsedDays} ngày trước`;
}

function MatchAvatar({
  profile,
  photoUrl,
  size = 64,
}: {
  profile: ProfilePublic;
  photoUrl?: string;
  size?: number;
}) {
  return (
    <Avatar
      label={`Ảnh hồ sơ của ${profile.displayName}`}
      uri={photoUrl}
      fallbackSource={getFallbackAvatar(profile.id, profile.gender)}
      size={size}
    />
  );
}

export function MatchesScreen({ navigation }: Props) {
  const services = useAppServices();
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [photoUrls, setPhotoUrls] = useState<PhotoUrls>({});
  const [incoming, setIncoming] = useState<IncomingCall>();
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!services) return;
    setLoading(true);
    setError('');
    const result = await services.matches.listMatches();
    setLoading(false);
    if (result.ok) setMatches(result.data.items);
    else setError(result.error.message);
  }, [services]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!services || matches.length === 0) return;
    let active = true;
    void Promise.all(
      matches.map(async (match) => {
        const photo = match.otherProfile.photos.find((item) => item.isPrimary) ?? match.otherProfile.photos[0];
        if (!photo) return [match.id, null] as const;
        const result = await services.profile.createPhotoUrl(photo.storagePath);
        return [match.id, result.ok ? result.data : null] as const;
      }),
    ).then((entries) => {
      if (!active) return;
      setPhotoUrls(Object.fromEntries(entries.filter((entry): entry is [string, string] => entry[1] !== null)));
    });
    return () => {
      active = false;
    };
  }, [matches, services]);

  useEffect(() => {
    if (!services || !user) return;
    const subscription = services.calls.subscribeIncoming(
      (call) => {
        if (call.status === 'ringing' && call.calleeId === user.id) setIncoming(call);
      },
      (nextError) => setError(nextError.message),
    );
    return () => subscription.unsubscribe();
  }, [services, user]);

  const header = (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <AppText accessibilityRole="header" style={styles.pageTitle}>
          Tin nhắn & Kết nối
        </AppText>
        <View style={styles.matchCount}>
          <AppIcon name="heart" color={colors.primaryPressed} size={15} />
          <Text style={styles.matchCountText}>{matches.length}</Text>
        </View>
      </View>
      <View style={styles.filterTabs}>
        {(
          [
            { key: 'all', label: 'Tất cả' },
            { key: 'chats', label: 'Đang nhắn' },
            { key: 'new', label: 'Match mới' },
          ] as const
        ).map((tab) => {
          const active = filter === tab.key;
          return (
            <AnimatedPressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                feedback('selection');
                setFilter(tab.key);
              }}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                {tab.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );

  if (!services) {
    return (
      <Screen safeTop>
        {header}
        <StatePanel title="Chưa thể tải kết nối" description="Cấu hình dịch vụ đang thiếu." />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen safeTop>
        {header}
        <AsyncStatePanel
          state="loading"
          title="Đang tải kết nối"
          description="Những người bạn đã kết nối thành công sẽ hiển thị ở đây."
        />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen safeTop>
        {header}
        <AsyncStatePanel
          state="error"
          title="Không thể tải kết nối"
          description={error}
          actionLabel="Thử lại"
          onAction={() => void load()}
        />
      </Screen>
    );
  }
  if (matches.length === 0) {
    return (
      <Screen safeTop>
        {header}
        <StatePanel
          title="Chưa có kết nối nào"
          description="Khi cả hai cùng thả tim ở màn Khám phá, hai bạn sẽ xuất hiện ở đây."
        />
      </Screen>
    );
  }

  const newMatches = matches.filter((match) => match.lastMessagePreview === null);
  const conversations = matches.filter((match) => match.lastMessagePreview !== null);
  const showNewMatches = (filter === 'all' || filter === 'new') && newMatches.length > 0;
  const showConversations = (filter === 'all' || filter === 'chats') && conversations.length > 0;
  const openChat = (matchId: string) => navigation.navigate('Chat', { matchId });

  return (
    <Screen safeTop contentStyle={styles.screen}>
      {header}
      {incoming ? (
        <StatePanel
          title="Cuộc gọi đến"
          description="Người bạn kết nối đang gọi cho bạn."
          actionLabel="Mở cuộc gọi"
          onAction={() =>
            navigation.navigate(incoming.type === 'video' ? 'VideoCall' : 'AudioCall', {
              matchId: incoming.matchId,
              callId: incoming.id,
              incoming: true,
            })
          }
        />
      ) : null}

      {showNewMatches ? (
        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Match mới
            </Text>
            <Text style={styles.sectionBody}>Đừng ngại gửi lời chào nhé</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newMatches}>
            {newMatches.map((match) => (
              <AnimatedPressable
                key={match.id}
                accessibilityRole="button"
                accessibilityLabel={`Mở trò chuyện với ${match.otherProfile.displayName}`}
                onPress={() => openChat(match.id)}
                style={styles.matchTile}
              >
                <View>
                  <MatchAvatar profile={match.otherProfile} photoUrl={photoUrls[match.id]} size={72} />
                  <View style={styles.matchBadge}>
                    <AppIcon name="heart" color={colors.onPrimary} size={13} />
                  </View>
                </View>
                <Text numberOfLines={1} style={styles.matchName}>
                  {match.otherProfile.displayName}
                </Text>
                <Text numberOfLines={1} style={styles.matchTime}>
                  {connectedAt(match.createdAt)}
                </Text>
              </AnimatedPressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {showConversations ? (
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Cuộc trò chuyện
          </Text>
          <View style={styles.conversationList}>
            {conversations.map((match) => (
              <AnimatedPressable
                key={match.id}
                accessibilityRole="button"
                accessibilityLabel={`Mở trò chuyện với ${match.otherProfile.displayName}`}
                onPress={() => openChat(match.id)}
                style={styles.conversationRow}
              >
                <MatchAvatar profile={match.otherProfile} photoUrl={photoUrls[match.id]} size={58} />
                <View style={styles.conversationContent}>
                  <View style={styles.conversationTopLine}>
                    <Text numberOfLines={1} style={styles.conversationName}>
                      {match.otherProfile.displayName}
                    </Text>
                    <Text style={styles.conversationTime}>{connectedAt(match.createdAt)}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.preview}>
                    {match.lastMessagePreview}
                  </Text>
                </View>
                <AppIcon name="forward" color={colors.inkMuted} size={18} />
              </AnimatedPressable>
            ))}
          </View>
        </View>
      ) : null}

      {filter === 'chats' && conversations.length === 0 && newMatches.length > 0 ? (
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`Bắt đầu trò chuyện với ${newMatches[0].otherProfile.displayName}`}
          onPress={() => openChat(newMatches[0].id)}
          style={styles.firstMessageCard}
        >
          <View style={styles.firstMessageIcon}>
            <AppIcon name="send" color={colors.primaryPressed} size={22} />
          </View>
          <View style={styles.firstMessageContent}>
            <Text style={styles.firstMessageTitle}>Mở lời cùng {newMatches[0].otherProfile.displayName}</Text>
            <Text style={styles.firstMessageBody}>Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!</Text>
          </View>
          <AppIcon name="forward" color={colors.primaryPressed} size={20} />
        </AnimatedPressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, paddingTop: spacing.xs },
  header: { gap: spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, color: colors.ink },
  filterTabs: { flexDirection: 'row', gap: spacing.xs },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.inkMuted,
  },
  filterPillTextActive: {
    fontFamily: fonts.bold,
    color: colors.onPrimary,
  },
  section: { gap: spacing.md },
  sectionHeading: { gap: 2 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  sectionBody: { ...type.caption, color: colors.inkMuted },
  matchCount: {
    minWidth: 44,
    height: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  matchCountText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primaryPressed },
  newMatches: { gap: spacing.md, paddingRight: spacing.lg },
  matchTile: { width: 82, alignItems: 'center', gap: 6 },
  matchBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchName: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, textAlign: 'center', width: '100%' },
  matchTime: { fontFamily: fonts.regular, fontSize: 11, color: colors.inkMuted, textAlign: 'center', width: '100%' },
  conversationList: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  conversationRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  conversationContent: { flex: 1, minWidth: 0, gap: 4 },
  conversationTopLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  conversationName: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, flex: 1 },
  conversationTime: { ...type.caption, color: colors.inkMuted },
  preview: { ...type.body, fontSize: 14, color: colors.inkMuted },
  firstMessageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  firstMessageIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  firstMessageContent: { flex: 1, gap: 2 },
  firstMessageTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  firstMessageBody: { ...type.caption, color: colors.inkMuted },
});
