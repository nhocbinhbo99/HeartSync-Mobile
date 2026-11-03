import { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { ProfilePublic } from '../../shared/types/domain.types';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Saved'>, NativeStackScreenProps<RootStackParamList>>;
type SavedItem = { profile: ProfilePublic; photoUrl?: string };

export function SavedScreen({ navigation }: Props) {
  const services = useAppServices();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

  const load = useCallback(async () => {
    if (!services) return;
    setLoading(true);
    setError('');
    const result = await services.saved.list();
    if (!result.ok) { setLoading(false); setError(result.error.message); return; }
    setItems(await withPhotoUrls(result.data.items));
    setNextCursor(result.data.nextCursor);
    setLoading(false);
  }, [services, withPhotoUrls]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const loadMore = async () => {
    if (!services || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    const result = await services.saved.list(nextCursor);
    setLoadingMore(false);
    if (!result.ok) { setError(result.error.message); return; }
    const nextItems = await withPhotoUrls(result.data.items);
    setItems((current) => [...current, ...nextItems]);
    setNextCursor(result.data.nextCursor);
  };

  const remove = async (profileId: string) => {
    if (!services) return;
    const previous = items;
    setRemovingId(profileId);
    setItems((current) => current.filter((item) => item.profile.id !== profileId));
    const result = await services.saved.setSaved(profileId, false);
    setRemovingId(undefined);
    if (!result.ok) { setItems(previous); setError(result.error.message); }
  };

  if (!services) return <Screen><StatePanel title="Chưa thể tải hồ sơ đã lưu" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang tải hồ sơ đã lưu" description="Chỉ bạn có thể xem danh sách này." /></Screen>;
  if (error && items.length === 0) return <Screen><AsyncStatePanel state="error" title="Không thể tải hồ sơ đã lưu"
    description={error} actionLabel="Thử lại" onAction={() => void load()} /></Screen>;

  return <Screen>
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={styles.title}>Hồ sơ đã lưu</Text>
      <Text style={styles.body}>Danh sách riêng tư để bạn xem lại sau. Bỏ lưu không ảnh hưởng tới lượt thích hoặc kết nối.</Text>
    </View>
    {items.length === 0 ? <StatePanel title="Chưa có hồ sơ đã lưu" description="Bạn có thể lưu một hồ sơ từ Khám phá để xem lại sau." />
      : items.map(({ profile, photoUrl }) => <View key={profile.id} style={styles.card}>
        {photoUrl ? <Image accessibilityLabel={`Ảnh của ${profile.displayName}`} source={{ uri: photoUrl }} style={styles.avatar} />
          : <View style={styles.avatarPlaceholder}><Text style={styles.avatarLetter}>{profile.displayName.slice(0, 1).toUpperCase()}</Text></View>}
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{profile.displayName}, {profile.age}</Text>
          <Text numberOfLines={2} style={styles.cardBody}>{profile.bio || profile.publicLocation || 'Chưa có phần giới thiệu.'}</Text>
          <View style={styles.actions}>
            <AppButton label="Xem hồ sơ" variant="secondary" style={styles.action}
              onPress={() => navigation.navigate('OtherProfile', { profileId: profile.id })} />
            <AppButton label={removingId === profile.id ? 'Đang bỏ…' : 'Bỏ lưu'} variant="quiet" style={styles.action}
              disabled={removingId === profile.id} onPress={() => void remove(profile.id)} />
          </View>
        </View>
      </View>)}
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    {nextCursor ? <AppButton label={loadingMore ? 'Đang tải…' : 'Tải thêm'} variant="secondary" disabled={loadingMore}
      onPress={() => void loadMore()} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs }, title: { ...type.title, color: colors.ink }, body: { ...type.body, color: colors.inkMuted },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg,
    padding: spacing.md, flexDirection: 'row', gap: spacing.md },
  avatar: { width: 92, height: 116, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  avatarPlaceholder: { width: 92, height: 116, borderRadius: radii.md, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center' }, avatarLetter: { ...type.display, color: colors.primaryPressed },
  cardCopy: { flex: 1, gap: spacing.xs }, cardTitle: { ...type.subtitle, color: colors.ink },
  cardBody: { ...type.body, color: colors.inkMuted }, actions: { gap: spacing.xs, marginTop: 'auto' }, action: { minHeight: 48 },
  error: { ...type.body, color: colors.danger },
});
