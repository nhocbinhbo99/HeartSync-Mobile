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
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { IncomingCall, MatchSummary, ProfilePublic } from '../../shared/types/domain.types';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Matches'>, NativeStackScreenProps<RootStackParamList>>;
type PhotoUrls = Record<string, string>;

const icons = {
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  chat: { ios: 'paperplane.fill', android: 'send', web: 'send' },
  call: { ios: 'phone.fill', android: 'call', web: 'call' },
} as const;

function connectedAt(createdAt: string) {
  const timestamp = new Date(createdAt).getTime();
  if (Number.isNaN(timestamp)) return 'Đã kết nối';
  const elapsedHours = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));
  if (elapsedHours < 1) return 'Vừa kết nối';
  if (elapsedHours < 24) return `Kết nối ${elapsedHours} giờ trước`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) return 'Kết nối hôm qua';
  return `Kết nối ${elapsedDays} ngày trước`;
}

function MatchAvatar({ profile, photoUrl, size = 64 }: { profile: ProfilePublic; photoUrl?: string; size?: number }) {
  return <Avatar label={`Ảnh hồ sơ của ${profile.displayName}`} uri={photoUrl} size={size} />;
}

export function MatchesScreen({ navigation }: Props) {
  const services = useAppServices();
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [photoUrls, setPhotoUrls] = useState<PhotoUrls>({});
  const [incoming, setIncoming] = useState<IncomingCall>();
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

  useFocusEffect(useCallback(() => {
    void load();
  }, [load]));

  useEffect(() => {
    if (!services || matches.length === 0) return;
    let active = true;
    void Promise.all(matches.map(async (match) => {
      const photo = match.otherProfile.photos.find((item) => item.isPrimary) ?? match.otherProfile.photos[0];
      if (!photo) return [match.id, null] as const;
      const result = await services.profile.createPhotoUrl(photo.storagePath);
      return [match.id, result.ok ? result.data : null] as const;
    })).then((entries) => {
      if (!active) return;
      setPhotoUrls(Object.fromEntries(entries.filter((entry): entry is [string, string] => entry[1] !== null)));
    });
    return () => { active = false; };
  }, [matches, services]);

  useEffect(() => {
    if (!services || !user) return;
    const subscription = services.calls.subscribeIncoming(
      (call) => { if (call.status === 'ringing' && call.calleeId === user.id) setIncoming(call); },
      (nextError) => setError(nextError.message),
    );
    return () => subscription.unsubscribe();
  }, [services, user]);

  const header = <ConnectionsHeader />;
  if (!services) return <Screen safeTop>{header}<StatePanel title="Chưa thể tải kết nối" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen safeTop>{header}<AsyncStatePanel state="loading" title="Đang tải kết nối" description="Chỉ mutual like do máy chủ xác nhận mới có ở đây." /></Screen>;
  if (error) return <Screen safeTop>{header}<AsyncStatePanel state="error" title="Không thể tải kết nối" description={error} actionLabel="Thử lại" onAction={() => void load()} /></Screen>;
  if (matches.length === 0) return <Screen safeTop>{header}<StatePanel title="Chưa có kết nối" description="Khi cả hai cùng thích, người đó sẽ xuất hiện ở đây." /></Screen>;

  const newMatches = matches.filter((match) => match.lastMessagePreview === null);
  const conversations = matches.filter((match) => match.lastMessagePreview !== null);
  const openChat = (matchId: string) => navigation.navigate('Chat', { matchId });

  return <Screen safeTop contentStyle={styles.screen}>
    {header}
    {incoming ? <StatePanel title="Cuộc gọi thoại đến" description="Người bạn kết nối đang gọi. Mic chỉ được bật sau khi bạn chấp nhận." actionLabel="Mở cuộc gọi" onAction={() => navigation.navigate('AudioCall', { matchId: incoming.matchId, callId: incoming.id, incoming: true })} /> : null}
    {newMatches.length ? <View style={styles.section}>
      <View style={styles.sectionHeading}><View><Text accessibilityRole="header" style={styles.sectionTitle}>Match mới</Text><Text style={styles.sectionBody}>Bắt đầu với người đã thích bạn.</Text></View><View style={styles.matchCount}><AppIcon name={icons.heart} color={colors.primaryPressed} size={15} /><Text style={styles.matchCountText}>{newMatches.length}</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newMatches}>
        {newMatches.map((match) => <AnimatedPressable key={match.id} accessibilityRole="button" accessibilityLabel={`Mở trò chuyện với ${match.otherProfile.displayName}`}
          onPress={() => openChat(match.id)} style={styles.matchTile}>
          <View><MatchAvatar profile={match.otherProfile} photoUrl={photoUrls[match.id]} size={74} /><View style={styles.matchBadge}><AppIcon name={icons.heart} color={colors.onPrimary} size={13} /></View></View>
          <Text numberOfLines={1} style={styles.matchName}>{match.otherProfile.displayName}</Text>
          <Text numberOfLines={1} style={styles.matchTime}>{connectedAt(match.createdAt)}</Text>
        </AnimatedPressable>)}
      </ScrollView>
    </View> : null}

    {conversations.length ? <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Tin nhắn</Text>
      <View style={styles.conversationList}>
        {conversations.map((match) => <AnimatedPressable key={match.id} accessibilityRole="button" accessibilityLabel={`Mở trò chuyện với ${match.otherProfile.displayName}`}
          onPress={() => openChat(match.id)} style={styles.conversationRow}>
          <MatchAvatar profile={match.otherProfile} photoUrl={photoUrls[match.id]} />
          <View style={styles.conversationContent}><View style={styles.conversationTopLine}><Text numberOfLines={1} style={styles.conversationName}>{match.otherProfile.displayName}</Text><Text style={styles.conversationTime}>{connectedAt(match.createdAt)}</Text></View><Text numberOfLines={2} style={styles.preview}>{match.lastMessagePreview}</Text></View>
          <AppIcon name={icons.chat} color={colors.primaryPressed} size={20} />
        </AnimatedPressable>)}
      </View>
    </View> : null}

    {newMatches.length && conversations.length === 0 ? <AnimatedPressable accessibilityRole="button" accessibilityLabel={`Bắt đầu trò chuyện với ${newMatches[0].otherProfile.displayName}`}
      onPress={() => openChat(newMatches[0].id)} style={styles.firstMessageCard}>
      <View style={styles.firstMessageIcon}><AppIcon name={icons.chat} color={colors.primaryPressed} size={22} /></View>
      <View style={styles.firstMessageContent}><Text style={styles.firstMessageTitle}>Mở lời cùng {newMatches[0].otherProfile.displayName}</Text><Text style={styles.firstMessageBody}>Một lời chào ngắn là đủ để bắt đầu.</Text></View>
      <AppIcon name={icons.chat} color={colors.primaryPressed} size={20} />
    </AnimatedPressable> : null}
  </Screen>;
}

function ConnectionsHeader() {
  return <View style={styles.header}><AppText accessibilityRole="header" variant="heading">Kết nối</AppText><AppText tone="muted">Bắt đầu với người đã thích bạn.</AppText></View>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl, paddingTop: spacing.sm },
  header: { gap: spacing.xxs },
  section: { gap: spacing.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionTitle: { ...type.title, color: colors.ink },
  sectionBody: { ...type.caption, color: colors.inkMuted, marginTop: spacing.xxs },
  matchCount: { minWidth: 36, height: 30, paddingHorizontal: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xxs },
  matchCountText: { ...type.label, color: colors.primaryPressed },
  newMatches: { gap: spacing.md, paddingRight: spacing.lg },
  matchTile: { width: 88, alignItems: 'center', gap: spacing.xs },
  matchBadge: { position: 'absolute', right: -2, bottom: -2, width: 25, height: 25, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.surface, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  matchName: { ...type.label, color: colors.ink, textAlign: 'center', width: '100%' },
  matchTime: { ...type.caption, color: colors.inkMuted, textAlign: 'center', width: '100%' },
  conversationList: { borderTopWidth: 1, borderColor: colors.border },
  conversationRow: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  conversationContent: { flex: 1, minWidth: 0, gap: spacing.xxs },
  conversationTopLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  conversationName: { ...type.subtitle, color: colors.ink, flex: 1 },
  conversationTime: { ...type.caption, color: colors.inkMuted },
  preview: { ...type.body, color: colors.inkMuted },
  firstMessageCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  firstMessageIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.primarySoft },
  firstMessageContent: { flex: 1, gap: spacing.xxs },
  firstMessageTitle: { ...type.subtitle, color: colors.ink },
  firstMessageBody: { ...type.caption, color: colors.inkMuted },
});
