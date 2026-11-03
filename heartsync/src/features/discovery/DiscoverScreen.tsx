import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { ProfilePublic, SwipeAction } from '../../shared/types/domain.types';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Discover'>, NativeStackScreenProps<RootStackParamList>>;

export function DiscoverScreen({ navigation }: Props) {
  const services = useAppServices();
  const [candidates, setCandidates] = useState<ProfilePublic[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<{ storagePath: string; url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [pageError, setPageError] = useState('');
  const [swipeError, setSwipeError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const requestRef = useRef(0);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);

  const load = useCallback(async (nextCursor?: string) => {
    if (!services) return;
    const request = ++requestRef.current;
    if (nextCursor) { setLoadingMore(true); setPageError(''); } else { setLoading(true); setCandidates([]); setCursor(null); setLoadError(''); }
    try {
      const preferences = await services.preferences.get();
      if (!preferences.ok) {
        if (request === requestRef.current) {
          if (nextCursor) setPageError(preferences.error.message);
          else setLoadError(preferences.error.message);
        }
        return;
      }
      const result = await services.discovery.getCandidates(preferences.data, nextCursor);
      if (request !== requestRef.current) return;
      if (!result.ok) {
        if (nextCursor) setPageError(result.error.message);
        else setLoadError(result.error.message);
        return;
      }
      setCandidates((current) => nextCursor
        ? [...current, ...result.data.items.filter((profile) => !current.some((item) => item.id === profile.id))]
        : result.data.items);
      setCursor(result.data.nextCursor);
    } catch {
      if (request === requestRef.current) {
        if (nextCursor) setPageError('Không thể tải thêm hồ sơ. Vui lòng thử lại.');
        else setLoadError('Không thể tải hồ sơ. Vui lòng thử lại.');
      }
    } finally {
      if (request === requestRef.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [services]);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { requestRef.current += 1; };
  }, [load]));

  const candidate = candidates[0];
  const photo = candidate?.photos.find((item) => item.isPrimary) ?? candidate?.photos[0];
  const photoPath = photo?.storagePath;
  const visiblePhotoUrl = photoUrl && photoPath && photoUrl.storagePath === photoPath ? photoUrl.url : null;
  useEffect(() => {
    let active = true;
    if (photoPath && services) void services.profile.createPhotoUrl(photoPath).then((result) => {
      if (active && result.ok) setPhotoUrl({ storagePath: photoPath, url: result.data });
    });
    return () => { active = false; };
  }, [photoPath, services]);

  const swipe = useCallback(async (action: SwipeAction) => {
    const current = candidate;
    if (!services || !current || busyRef.current) return;
    busyRef.current = true; setBusy(true); setSwipeError('');
    try {
      const result = await services.matches.recordSwipe(current.id, action);
      if (!result.ok) { setSwipeError(result.error.message); return; }
      setCandidates((items) => items[0]?.id === current.id ? items.slice(1) : items);
      if (result.data.outcome === 'matched') navigation.navigate('MatchFound', { matchId: result.data.matchId });
      else if (candidates.length <= 2 && cursor && !loadingMore) void load(cursor);
    } catch {
      setSwipeError('Không thể lưu thao tác. Vui lòng thử lại.');
    } finally {
      busyRef.current = false; setBusy(false);
    }
  }, [candidate, candidates.length, cursor, load, loadingMore, navigation, services]);

  const captureSwipeStart = (pageX: number, pageY: number) => { swipeStartXRef.current = pageX; swipeStartYRef.current = pageY; };
  const isHorizontalSwipe = (pageX: number, pageY: number) => {
    const dx = pageX - (swipeStartXRef.current ?? pageX);
    const dy = pageY - (swipeStartYRef.current ?? pageY);
    return Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.5;
  };
  const finishSwipe = (pageX: number) => {
    const dx = pageX - (swipeStartXRef.current ?? pageX);
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;
    if (Math.abs(dx) >= 90) void swipe(dx > 0 ? 'like' : 'pass');
  };

  if (!services) return <Screen><StatePanel title="Chưa thể tải Khám phá" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang tìm hồ sơ phù hợp" description="Chỉ dữ liệu công khai đủ điều kiện được tải." /></Screen>;
  if (loadError) return <Screen><AsyncStatePanel state="error" title="Không thể tải Khám phá" description={loadError} actionLabel="Thử lại" onAction={() => void load()} /><AppButton label="Mở bộ lọc" variant="secondary" onPress={() => navigation.navigate('Filters')} /></Screen>;
  if (!candidate) return <Screen><Text accessibilityRole="header" style={styles.title}>Khám phá</Text><StatePanel title={loadingMore ? 'Đang tìm thêm hồ sơ' : 'Chưa có gợi ý mới'} description="Hãy chỉnh bộ lọc hoặc quay lại sau khi có hồ sơ đủ điều kiện." /><AppButton label="Tải lại" variant="secondary" onPress={() => void load()} /><AppButton label="Mở bộ lọc" onPress={() => navigation.navigate('Filters')} /></Screen>;

  return <Screen>
    <Text accessibilityRole="header" style={styles.title}>Khám phá</Text>
    <View
      onTouchStart={(event) => captureSwipeStart(event.nativeEvent.pageX, event.nativeEvent.pageY)}
      onMoveShouldSetResponder={(event) => isHorizontalSwipe(event.nativeEvent.pageX, event.nativeEvent.pageY)}
      onMoveShouldSetResponderCapture={(event) => isHorizontalSwipe(event.nativeEvent.pageX, event.nativeEvent.pageY)}
      onResponderRelease={(event) => finishSwipe(event.nativeEvent.pageX)}
      style={styles.card}>
      {visiblePhotoUrl ? <Image source={{ uri: visiblePhotoUrl }} style={styles.photo} accessibilityLabel={`Ảnh hồ sơ của ${candidate.displayName}`} /> : <View style={styles.photoPlaceholder}><Text style={styles.placeholderText}>Chưa có ảnh</Text></View>}
      <Text style={styles.name}>{candidate.displayName}, {candidate.age}</Text>
      <Text style={styles.detail}>{[candidate.bio, candidate.occupation, candidate.education, candidate.publicLocation, candidate.interests.join(', '), candidate.languages.join(', ')].filter(Boolean).join('\n') || 'Hồ sơ này chưa thêm phần giới thiệu.'}</Text>
      <Text style={styles.hint}>Vuốt phải để thích · Vuốt trái để bỏ qua</Text>
    </View>
    {swipeError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{swipeError}</Text> : null}
    {pageError ? <><Text accessibilityLiveRegion="polite" style={styles.error}>{pageError}</Text><AppButton label="Tải thêm hồ sơ" variant="secondary" disabled={loadingMore} onPress={() => { if (cursor) void load(cursor); }} /></> : null}
    <AppButton label="Xem hồ sơ" variant="secondary" onPress={() => navigation.navigate('OtherProfile', { profileId: candidate.id })} />
    <AppButton label={busy ? 'Đang lưu…' : 'Thích'} disabled={busy} onPress={() => void swipe('like')} />
    <AppButton label="Bỏ qua" variant="secondary" disabled={busy} onPress={() => void swipe('pass')} />
    <AppButton label="Mở bộ lọc" variant="quiet" onPress={() => navigation.navigate('Filters')} />
  </Screen>;
}

const styles = StyleSheet.create({
  title: { ...type.title, color: colors.ink },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm },
  photo: { width: '100%', height: 280, borderRadius: radii.md },
  photoPlaceholder: { height: 160, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { ...type.body, color: colors.inkMuted },
  name: { ...type.title, color: colors.ink },
  detail: { ...type.body, color: colors.ink },
  hint: { ...type.caption, color: colors.inkMuted },
  error: { ...type.caption, color: colors.danger },
});
