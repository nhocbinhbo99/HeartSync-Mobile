import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, View } from 'react-native';
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
import { colors, fonts, radii, spacing } from '../../shared/theme/tokens';
import type { ProfilePublic } from '../../shared/types/domain.types';
import { brandAssets, getProfileImageSource } from '../../shared/utils/avatarHelper';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Saved'>,
  NativeStackScreenProps<RootStackParamList>
>;
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

  const withPhotoUrls = useCallback(
    async (profiles: ProfilePublic[]) => {
      if (!services) return [];
      return Promise.all(
        profiles.map(async (profile): Promise<SavedItem> => {
          const primary = profile.photos.find((photo) => photo.isPrimary) ?? profile.photos[0];
          if (!primary) return { profile };
          const result = await services.profile.createPhotoUrl(primary.storagePath);
          return result.ok ? { profile, photoUrl: result.data } : { profile };
        }),
      );
    },
    [services],
  );

  const load = useCallback(
    async (isRefresh = false) => {
      if (!services) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      const result = await services.saved.list();
      if (!result.ok) {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
        setError(result.error.message);
        return;
      }
      setItems(await withPhotoUrls(result.data.items));
      setNextCursor(result.data.nextCursor);
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    },
    [services, withPhotoUrls],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const loadMore = async () => {
    if (!services || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    const result = await services.saved.list(nextCursor);
    setLoadingMore(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    const nextItems = await withPhotoUrls(result.data.items);
    setItems((current) => [
      ...current,
      ...nextItems.filter((item) => !current.some((saved) => saved.profile.id === item.profile.id)),
    ]);
    setNextCursor(result.data.nextCursor);
  };

  const restore = async (removed: SavedItem) => {
    if (!services) return;
    setItems((current) =>
      current.some((item) => item.profile.id === removed.profile.id) ? current : [removed, ...current],
    );
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
    snackbar.show({
      message: `Đã bỏ lưu ${removed.profile.displayName}`,
      tone: 'neutral',
      actionLabel: 'Hoàn tác',
      onAction: () => void restore(removed),
    });
  };

  if (!services) {
    return (
      <Screen safeTop>
        <StatePanel title="Chưa thể tải hồ sơ đã lưu" description="Cấu hình dịch vụ đang thiếu." />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen safeTop>
        <AsyncStatePanel
          state="loading"
          title="Đang tải hồ sơ đã lưu"
          description="Chỉ bạn có thể xem danh sách này."
        />
      </Screen>
    );
  }
  if (error && items.length === 0) {
    return (
      <Screen safeTop>
        <AsyncStatePanel
          state="error"
          title="Không thể tải hồ sơ đã lưu"
          description={error}
          actionLabel="Thử lại"
          onAction={() => void load()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} safeTop contentStyle={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.profile.id}
        numColumns={2}
        columnWrapperStyle={items.length ? styles.row : undefined}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <SavedCard
            item={item}
            removing={removingId === item.profile.id}
            onOpen={() => navigation.navigate('OtherProfile', { profileId: item.profile.id })}
            onRemove={() => void remove(item.profile.id)}
          />
        )}
        ListHeaderComponent={
          <View style={styles.intro}>
            <AppText accessibilityRole="header" style={styles.introTitle}>
              Đã lưu
            </AppText>
            <AppText tone="muted" style={styles.introBody}>
              Những người bạn muốn tìm hiểu thêm.
            </AppText>
          </View>
        }
        ListEmptyComponent={
          <StatePanel
            title="Chưa có hồ sơ đã lưu"
            description="Khi xem hồ sơ chi tiết từ Khám phá, bấm biểu tượng lưu để giữ lại xem sau nhé."
          />
        }
        ListFooterComponent={
          nextCursor ? (
            <View style={styles.footer}>
              {loadingMore ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Tải thêm hồ sơ đã lưu"
                  onPress={() => void loadMore()}
                  style={styles.loadMore}
                >
                  <AppIcon name="refresh" color={colors.primaryPressed} size={20} />
                  <AppText variant="label" tone="primary">
                    Tải thêm
                  </AppText>
                </AnimatedPressable>
              )}
              {error ? (
                <AppText accessibilityLiveRegion="polite" variant="caption" tone="danger" style={styles.error}>
                  {error}
                </AppText>
              ) : null}
            </View>
          ) : undefined
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function SavedCard({
  item,
  removing,
  onOpen,
  onRemove,
}: {
  item: SavedItem;
  removing: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const { profile, photoUrl } = item;
  return (
    <View style={styles.card}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`Xem hồ sơ ${profile.displayName}`}
        accessibilityHint="Mở hồ sơ công khai"
        onPress={onOpen}
        style={styles.cardTap}
      >
        <Image
          accessibilityLabel={`Ảnh của ${profile.displayName}`}
          source={getProfileImageSource(photoUrl, profile.id, profile.gender, profile.displayName)}
          style={styles.avatar}
        />
        <Image
          source={brandAssets.cardScrimGradient}
          style={styles.cardScrim}
          resizeMode="stretch"
        />
        <View style={styles.cardCopy}>
          <View style={styles.cardNameRow}>
            <AppText numberOfLines={1} variant="subtitle" tone="onPrimary" style={styles.cardName}>
              {profile.displayName}, {profile.age}
            </AppText>
            <View style={styles.verifiedDot}>
              <AppIcon name="check" color="#FFFFFF" size={10} />
            </View>
          </View>
          <AppText numberOfLines={1} variant="caption" tone="onPrimary" style={styles.cardSub}>
            {profile.interests[0] || profile.publicLocation || 'TP. Hồ Chí Minh'}
          </AppText>
        </View>
      </AnimatedPressable>
      <IconButton
        icon="bookmarkFilled"
        label={`Bỏ lưu ${profile.displayName}`}
        tone="onPrimary"
        disabled={removing}
        onPress={onRemove}
        style={styles.removeButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 0 },
  content: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  row: { gap: spacing.md },
  intro: { gap: 4, marginBottom: spacing.sm },
  introTitle: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, color: colors.ink },
  introBody: { fontSize: 15, lineHeight: 22 },
  card: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 0.72,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#D65B88',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTap: { flex: 1, borderRadius: 24 },
  avatar: { width: '100%', height: '100%', resizeMode: 'cover', backgroundColor: colors.surfaceMuted },
  cardScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '52%',
  },
  cardCopy: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardName: { fontFamily: fonts.bold, fontSize: 16, flexShrink: 1 },
  verifiedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.verified,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSub: { opacity: 0.9, fontSize: 12 },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(230, 56, 111, 0.78)',
  },
  footer: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  loadMore: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  error: { textAlign: 'center' },
});
