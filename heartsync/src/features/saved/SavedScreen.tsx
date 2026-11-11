import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { IconButton } from '../../shared/components/IconButton';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { useSnackbar } from '../../shared/components/Snackbar';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { ProfilePublic } from '../../shared/types/domain.types';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Saved'>, NativeStackScreenProps<RootStackParamList>>;
type SavedItem = { profile: ProfilePublic; photoUrl?: string };

export function SavedScreen({ navigation }: Props) {
  const services = useAppServices();
  const snackbar = useSnackbar();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [removingId, setRemovingId] = useState<string>();
  const [error, setError] = useState('');

  const withPhotoUrls = useCallback(async (profiles: ProfilePublic[]) => {
    if (!services) return [];
    return Promise.all(profiles.map(async (profile): Promise<SavedItem> => {
      const primary = profile.photos.find((photo) => photo.isPrimary) ?? profile.photos[0];
      if (!primary) return { profile };
      const result = await services.profile.createPhotoUrl(primary.storagePath);
      return result.ok ? { profile, photoUrl: result.data } : { profile };
    }));
  }, [services]);

  const load = useCallback(async (isRefresh = false) => {
    if (!services) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    const result = await services.saved.list();
    if (!result.ok) {
      if (isRefresh) setRefreshing(false); else setLoading(false);
      setError(result.error.message);
      return;
    }
    setItems(await withPhotoUrls(result.data.items));
    setNextCursor(result.data.nextCursor);
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, [services, withPhotoUrls]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const loadMore = async () => {
    if (!services || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    const result = await services.saved.list(nextCursor);
    setLoadingMore(false);
    if (!result.ok) { setError(result.error.message); return; }
    const nextItems = await withPhotoUrls(result.data.items);
    setItems((current) => [...current, ...nextItems.filter((item) => !current.some((saved) => saved.profile.id === item.profile.id))]);
    setNextCursor(result.data.nextCursor);
  };

  const restore = async (removed: SavedItem) => {
    if (!services) return;
    setItems((current) => current.some((item) => item.profile.id === removed.profile.id) ? current : [removed, ...current]);
    const result = await services.saved.setSaved(removed.profile.id, true);
    if (!result.ok) {
      setItems((current) => current.filter((item) => item.profile.id !== removed.profile.id));
      snackbar.show({ message: result.error.message, tone: 'error' });
    }
  };

  const remove = async (profileId: string) => {
    if (!services || removingId) return;
    const removed = items.find((item) => item.profile.id === profileId);
    if (!removed) return;
    setRemovingId(profileId);
    setItems((current) => current.filter((item) => item.profile.id !== profileId));
    const result = await services.saved.setSaved(profileId, false);
    setRemovingId(undefined);
    if (!result.ok) {
      setItems((current) => [removed, ...current]);
      snackbar.show({ message: result.error.message, tone: 'error' });
      return;
    }
    snackbar.show({ message: `Đã bỏ lưu ${removed.profile.displayName}`, tone: 'neutral', actionLabel: 'Hoàn tác', onAction: () => void restore(removed) });
  };

  if (!services) return <Screen><StatePanel title="Chưa thể tải hồ sơ đã lưu" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang tải hồ sơ đã lưu" description="Chỉ bạn có thể xem danh sách này." /></Screen>;
  if (error && items.length === 0) return <Screen><AsyncStatePanel state="error" title="Không thể tải hồ sơ đã lưu" description={error} actionLabel="Thử lại" onAction={() => void load()} /></Screen>;

  return <Screen scroll={false} contentStyle={styles.screen}>
    <FlatList data={items} keyExtractor={(item) => item.profile.id} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[colors.primary]} tintColor={colors.primary} />}
      renderItem={({ item }) => <SavedCard item={item} removing={removingId === item.profile.id}
        onOpen={() => navigation.navigate('OtherProfile', { profileId: item.profile.id })} onRemove={() => void remove(item.profile.id)} />}
      ListHeaderComponent={<View style={styles.intro}><View style={styles.titleRow}><View style={styles.iconCircle}><AppIcon name="bookmarkFilled" color={colors.primaryPressed} size={22} /></View><View style={styles.introCopy}><AppText accessibilityRole="header" variant="title">Đã lưu</AppText><AppText tone="muted">Danh sách riêng tư để bạn xem lại sau.</AppText></View></View></View>}
      ListEmptyComponent={<StatePanel title="Chưa có hồ sơ đã lưu" description="Bạn có thể lưu một hồ sơ từ Khám phá để xem lại sau." />}
      ListFooterComponent={nextCursor ? <View style={styles.footer}>{loadingMore ? <ActivityIndicator color={colors.primary} /> : <AnimatedPressable accessibilityRole="button" accessibilityLabel="Tải thêm hồ sơ đã lưu" onPress={() => void loadMore()} style={styles.loadMore}><AppIcon name="refresh" color={colors.primaryPressed} size={20} /><AppText variant="label" tone="primary">Tải thêm</AppText></AnimatedPressable>}{error ? <AppText accessibilityLiveRegion="polite" variant="caption" tone="danger" style={styles.error}>{error}</AppText> : null}</View> : undefined}
      onEndReached={() => void loadMore()} onEndReachedThreshold={0.3} showsVerticalScrollIndicator={false} />
  </Screen>;
}

function SavedCard({ item, removing, onOpen, onRemove }: { item: SavedItem; removing: boolean; onOpen: () => void; onRemove: () => void }) {
  const { profile, photoUrl } = item;
  return <View style={styles.card}>
    <AnimatedPressable accessibilityRole="button" accessibilityLabel={`Xem hồ sơ ${profile.displayName}`} accessibilityHint="Mở hồ sơ công khai" onPress={onOpen} style={styles.cardTap}>
      {photoUrl ? <Image accessibilityLabel={`Ảnh của ${profile.displayName}`} source={{ uri: photoUrl }} style={styles.avatar} />
        : <View accessible accessibilityRole="image" accessibilityLabel={`Ảnh đại diện của ${profile.displayName}`} style={styles.avatarPlaceholder}><AppText variant="title" tone="primary">{profile.displayName.slice(0, 1).toLocaleUpperCase('vi-VN')}</AppText></View>}
      <View style={styles.cardCopy}>
        <AppText variant="subtitle">{profile.displayName}, {profile.age}</AppText>
        {profile.publicLocation ? <View style={styles.location}><AppIcon name="location" color={colors.inkMuted} size={16} /><AppText numberOfLines={1} variant="caption" tone="muted" style={styles.locationText}>{profile.publicLocation}</AppText></View> : null}
        <AppText numberOfLines={2} variant="caption" tone="muted">{profile.bio || 'Chưa có phần giới thiệu.'}</AppText>
      </View>
    </AnimatedPressable>
    <IconButton icon="bookmarkFilled" label={`Bỏ lưu ${profile.displayName}`} tone="primary" disabled={removing} onPress={onRemove} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { padding: 0 }, content: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  intro: { marginBottom: spacing.xs }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, iconCircle: { width: 48, height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }, introCopy: { flex: 1, gap: spacing.xxs },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.xs }, cardTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.md },
  avatar: { width: 82, height: 106, borderRadius: radii.md, backgroundColor: colors.surfaceMuted }, avatarPlaceholder: { width: 82, height: 106, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1, gap: spacing.xxs }, location: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs }, locationText: { flex: 1 },
  footer: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm }, loadMore: { minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, error: { textAlign: 'center' },
});
