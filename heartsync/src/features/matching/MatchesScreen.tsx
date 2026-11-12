import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../auth/AuthProvider';
import { useAppServices } from '../../services/AppServicesProvider';
import {
  getCachedPhotoUrl,
  resolvePhotoUrls,
  setCachedPublicProfile,
} from '../../services/photoCache';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { Avatar } from '../../shared/components/Avatar';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, fonts, radii, spacing } from '../../shared/theme/tokens';
import type { IncomingCall, MatchSummary, ProfilePublic } from '../../shared/types/domain.types';
import { getFallbackAvatar } from '../../shared/utils/avatarHelper';
import { feedback } from '../../shared/motion/feedback';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Matches'>,
  NativeStackScreenProps<RootStackParamList>
>;
type ResolvedPhoto = { storagePath: string; url: string };
type PhotoUrls = Record<string, ResolvedPhoto>;
type MatchFilter = 'all' | 'chats' | 'new';

function connectedAt(createdAt: string) {
  const timestamp = new Date(createdAt).getTime();
  if (Number.isNaN(timestamp)) return 'Hôm nay';
  const date = new Date(timestamp);
  const elapsedHours = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));
  if (elapsedHours < 24) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) return 'Hôm qua';
  if (elapsedDays < 7) return `Thứ ${((date.getDay() + 6) % 7) + 2}`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function primaryPhotoPath(profile: ProfilePublic): string | undefined {
  return (profile.photos.find((item) => item.isPrimary) ?? profile.photos[0])?.storagePath;
}

function areMatchesEqual(a: MatchSummary[], b: MatchSummary[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].id !== b[i].id ||
      a[i].lastMessagePreview !== b[i].lastMessagePreview ||
      a[i].lastMessageAt !== b[i].lastMessageAt ||
      a[i].unreadCount !== b[i].unreadCount ||
      primaryPhotoPath(a[i].otherProfile) !== primaryPhotoPath(b[i].otherProfile)
    ) {
      return false;
    }
  }
  return true;
}

function MatchAvatar({
  profile,
  photoUrl,
  size = 58,
}: {
  profile: ProfilePublic;
  photoUrl?: ResolvedPhoto;
  size?: number;
}) {
  const path = primaryPhotoPath(profile);
  const resolved = (photoUrl && photoUrl.storagePath === path ? photoUrl.url : undefined) ?? getCachedPhotoUrl(path);
  return (
    <Avatar
      label={`Ảnh hồ sơ của ${profile.displayName}`}
      uri={resolved}
      fallbackSource={path ? undefined : getFallbackAvatar(profile.id, profile.gender, profile.displayName)}
      size={size}
    />
  );
}

export function MatchesScreen({ navigation }: Props) {
  const services = useAppServices();
  const { user } = useAuth();
  const userId = user?.id;
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [photoUrls, setPhotoUrls] = useState<PhotoUrls>({});
  const [incoming, setIncoming] = useState<IncomingCall>();
  const [filter, setFilter] = useState<MatchFilter>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      if (!services) return;
      const requestId = ++requestIdRef.current;
      if (!hasLoadedRef.current && !silent) setLoading(true);
      if (!silent) setError('');
      const result = await services.matches.listMatches();
      if (requestId !== requestIdRef.current) return;
      if (!result.ok) {
        if (!hasLoadedRef.current) setLoading(false);
        setError(result.error.message);
        return;
      }
      const nextMatches = result.data.items;
      for (const match of nextMatches) {
        setCachedPublicProfile(match.otherProfile);
      }
      const paths = nextMatches.map((m) => primaryPhotoPath(m.otherProfile));
      const resolvedMap = await resolvePhotoUrls(services.profile, paths);
      if (requestId !== requestIdRef.current) return;

      const nextPhotos: PhotoUrls = {};
      for (const match of nextMatches) {
        const path = primaryPhotoPath(match.otherProfile);
        if (path && resolvedMap[path]) {
          nextPhotos[match.id] = { storagePath: path, url: resolvedMap[path] };
        }
      }

      hasLoadedRef.current = true;
      setLoading(false);
      setPhotoUrls((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(nextPhotos);
        if (
          prevKeys.length === nextKeys.length &&
          nextKeys.every(
            (k) => prev[k]?.storagePath === nextPhotos[k].storagePath && prev[k]?.url === nextPhotos[k].url,
          )
        ) {
          return prev;
        }
        return nextPhotos;
      });
      setMatches((prev) => (areMatchesEqual(prev, nextMatches) ? prev : nextMatches));
    },
    [services],
  );

  useFocusEffect(
    useCallback(() => {
      void load(hasLoadedRef.current);
    }, [load]),
  );

  useEffect(() => {
    if (!services || !userId) return;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const inboxSub = services.chat.subscribeInbox(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void load(true);
      }, 450);
    });
    const callSub = services.calls.subscribeIncoming(
      (call) => {
        if (call.status === 'ringing' && call.calleeId === userId) setIncoming(call);
      },
      (nextError) => setError(nextError.message),
    );
    return () => {
      clearTimeout(debounceTimer);
      inboxSub.unsubscribe();
      callSub.unsubscribe();
    };
  }, [load, services, userId]);

  const header = (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <AppText accessibilityRole="header" style={styles.pageTitle}>
          Tin nhắn
        </AppText>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={searchOpen ? 'Đóng tìm kiếm tin nhắn' : 'Tìm kiếm tin nhắn'}
          onPress={() => {
            feedback('selection');
            setSearchOpen((prev) => {
              if (prev) setSearchQuery('');
              return !prev;
            });
          }}
          style={[styles.searchCircle, searchOpen && styles.searchCircleActive]}
        >
          <AppIcon
            name={searchOpen ? 'close' : 'search'}
            color={searchOpen ? '#FFFFFF' : colors.ink}
            size={20}
          />
        </AnimatedPressable>
      </View>
      {searchOpen ? (
        <View style={styles.searchBox}>
          <AppIcon name="search" color={colors.inkMuted} size={18} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm theo tên hoặc nội dung tin nhắn..."
            placeholderTextColor={colors.inkMuted}
            accessibilityLabel="Tìm kiếm cuộc trò chuyện"
            style={styles.searchInput}
          />
          {searchQuery ? (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Xóa từ khóa tìm kiếm"
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
            >
              <AppIcon name="close" color={colors.inkMuted} size={15} />
            </AnimatedPressable>
          ) : null}
        </View>
      ) : null}
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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesByQuery = normalizedQuery
    ? matches.filter(
        (match) =>
          match.otherProfile.displayName.toLowerCase().includes(normalizedQuery) ||
          (match.lastMessagePreview ?? '').toLowerCase().includes(normalizedQuery),
      )
    : matches;
  const newMatches = matchesByQuery.filter((match) => match.lastMessagePreview === null);
  const conversations = matchesByQuery.filter((match) => match.lastMessagePreview !== null);
  const visibleRows =
    filter === 'all' ? matchesByQuery : filter === 'chats' ? conversations : newMatches;
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

      {filter === 'all' && newMatches.length > 0 && conversations.length > 0 ? (
        <View style={styles.newMatchesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.newMatchesScroll}
            contentContainerStyle={styles.newMatchesStrip}
          >
            {newMatches.map((match) => (
              <AnimatedPressable
                key={`strip-${match.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Mở trò chuyện với ${match.otherProfile.displayName}`}
                onPress={() => openChat(match.id)}
                style={styles.matchTile}
              >
                <View style={styles.avatarWrap}>
                  <MatchAvatar profile={match.otherProfile} photoUrl={photoUrls[match.id]} size={64} />
                  <View style={styles.heartMiniBadge}>
                    <AppIcon name="heart" color={colors.onPrimary} size={11} />
                  </View>
                </View>
                <Text numberOfLines={1} style={styles.matchName}>
                  {match.otherProfile.displayName}
                </Text>
              </AnimatedPressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.conversationList}>
        {visibleRows.map((match) => {
          const isNew = match.lastMessagePreview === null;
          return (
            <AnimatedPressable
              key={match.id}
              accessibilityRole="button"
              accessibilityLabel={`Mở trò chuyện với ${match.otherProfile.displayName}`}
              onPress={() => openChat(match.id)}
              style={styles.conversationRow}
            >
              <View style={styles.avatarWrap}>
                <MatchAvatar profile={match.otherProfile} photoUrl={photoUrls[match.id]} size={60} />
                <View style={isNew ? styles.heartMiniBadge : styles.onlineDot}>
                  {isNew ? <AppIcon name="heart" color={colors.onPrimary} size={11} /> : null}
                </View>
              </View>

              <View style={styles.conversationContent}>
                <View style={styles.conversationTopLine}>
                  <Text numberOfLines={1} style={styles.conversationName}>
                    {match.otherProfile.displayName}
                  </Text>
                  <Text style={styles.conversationTime}>{connectedAt(match.createdAt)}</Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.preview, isNew && styles.previewNewMatch]}
                >
                  {match.lastMessagePreview ?? 'Hai bạn vừa kết nối! Gửi lời chào ngay nhé 💕'}
                </Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.md,
    paddingTop: 4,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#FFF7F9',
  },
  header: { gap: spacing.md },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
  },
  searchCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F5D6E2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D67094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  searchCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAD6DF',
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14.5,
    color: colors.ink,
    paddingVertical: 8,
  },
  clearSearchBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F4EEF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 10,
  },
  filterPill: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#EAD6DF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: '#E6386F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  filterPillText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },
  filterPillTextActive: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
  newMatchesSection: {
    flexGrow: 0,
    flexShrink: 0,
  },
  newMatchesScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  newMatchesStrip: {
    gap: spacing.md,
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  matchTile: {
    width: 76,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: radii.lg,
    alignItems: 'center',
    gap: 6,
  },
  avatarWrap: {
    position: 'relative',
  },
  heartMiniBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    backgroundColor: colors.online,
  },
  matchName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
    textAlign: 'center',
    width: '100%',
  },
  conversationList: {
    gap: 2,
  },
  conversationRow: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F6E0E9',
  },
  conversationContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  conversationTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  conversationName: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
    flex: 1,
  },
  conversationTime: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: colors.inkMuted,
  },
  preview: {
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  previewNewMatch: {
    fontFamily: fonts.semibold,
    color: colors.primaryPressed,
  },
});
