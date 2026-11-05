import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { ProfilePublic, SwipeAction } from '../../shared/types/domain.types';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Discover'>, NativeStackScreenProps<RootStackParamList>>;
type IconName = ComponentProps<typeof AppIcon>['name'];

const SWIPE_THRESHOLD = 88;
const PREVIEW_INTEREST_COUNT = 3;

const icons = {
  filter: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  pass: { ios: 'xmark', android: 'close', web: 'close' },
  profile: { ios: 'person.crop.circle', android: 'person', web: 'person' },
  like: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  location: { ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' },
  work: { ios: 'briefcase.fill', android: 'work', web: 'work' },
  photo: { ios: 'person.crop.circle', android: 'person', web: 'person' },
} as const satisfies Record<string, IconName>;

type SwipeControlProps = {
  accessibilityLabel: string;
  disabled: boolean;
  icon: IconName;
  onPress: () => void;
  tone: 'pass' | 'profile' | 'like';
};

function SwipeControl({ accessibilityLabel, disabled, icon, onPress, tone }: SwipeControlProps) {
  const iconColor = tone === 'like' ? colors.onPrimary : tone === 'pass' ? colors.danger : colors.primaryPressed;
  const toneStyle = tone === 'like' ? styles.actionLike : tone === 'pass' ? styles.actionPass : styles.actionProfile;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.actionControl, toneStyle, pressed && !disabled && styles.actionPressed, disabled && styles.actionDisabled]}>
    <AppIcon name={icon} color={iconColor} size={25} />
  </Pressable>;
}

export function DiscoverScreen({ navigation }: Props) {
  const services = useAppServices();
  const { width } = useWindowDimensions();
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
  const hasHorizontalGestureRef = useRef(false);
  const [swipeX] = useState(() => new Animated.Value(0));
  const [swipeY] = useState(() => new Animated.Value(0));

  const resetCard = useCallback((animated = false) => {
    if (!animated) {
      swipeX.setValue(0);
      swipeY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, friction: 7, tension: 85 }),
      Animated.spring(swipeY, { toValue: 0, useNativeDriver: true, friction: 7, tension: 85 }),
    ]).start();
  }, [swipeX, swipeY]);

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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <Pressable accessibilityRole="button" accessibilityLabel="Mở bộ lọc khám phá"
        hitSlop={8} onPress={() => navigation.navigate('Filters')} style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}>
        <AppIcon name={icons.filter} color={colors.primaryPressed} size={24} />
      </Pressable>,
    });
  }, [navigation]);

  const candidate = candidates[0];
  const nextCandidate = candidates[1];
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
    busyRef.current = true;
    setBusy(true);
    setSwipeError('');
    const direction = action === 'like' ? 1 : -1;
    const flyDistance = Math.max(width + 80, 420) * direction;

    Animated.parallel([
      Animated.timing(swipeX, { toValue: flyDistance, duration: 180, useNativeDriver: true }),
      Animated.timing(swipeY, { toValue: -20, duration: 180, useNativeDriver: true }),
    ]).start(async () => {
      try {
        const result = await services.matches.recordSwipe(current.id, action);
        if (!result.ok) {
          setSwipeError(result.error.message);
          resetCard(true);
          return;
        }
        resetCard();
        setCandidates((items) => items[0]?.id === current.id ? items.slice(1) : items);
        if (result.data.outcome === 'matched') {
          navigation.navigate('MatchFound', { matchId: result.data.matchId });
        } else if (candidates.length <= 2 && cursor && !loadingMore) {
          void load(cursor);
        }
      } catch {
        setSwipeError('Không thể lưu thao tác. Vui lòng thử lại.');
        resetCard(true);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    });
  }, [candidate, candidates.length, cursor, load, loadingMore, navigation, resetCard, services, swipeX, swipeY, width]);

  const captureSwipeStart = (pageX: number, pageY: number) => {
    swipeStartXRef.current = pageX;
    swipeStartYRef.current = pageY;
    hasHorizontalGestureRef.current = false;
  };
  const isHorizontalSwipe = (pageX: number, pageY: number) => {
    const dx = pageX - (swipeStartXRef.current ?? pageX);
    const dy = pageY - (swipeStartYRef.current ?? pageY);
    const isHorizontal = Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.25;
    if (isHorizontal) hasHorizontalGestureRef.current = true;
    return isHorizontal;
  };
  const moveCard = (pageX: number, pageY: number) => {
    const dx = pageX - (swipeStartXRef.current ?? pageX);
    const dy = pageY - (swipeStartYRef.current ?? pageY);
    swipeX.setValue(dx);
    swipeY.setValue(dy * 0.08);
  };
  const finishSwipe = (pageX: number) => {
    const dx = pageX - (swipeStartXRef.current ?? pageX);
    swipeStartXRef.current = null;
    swipeStartYRef.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) void swipe(dx > 0 ? 'like' : 'pass');
    else resetCard(true);
  };
  const openProfileFromCard = () => {
    if (!hasHorizontalGestureRef.current && !busyRef.current && candidate) {
      navigation.navigate('OtherProfile', { profileId: candidate.id });
    }
  };

  const rotation = swipeX.interpolate({ inputRange: [-width, 0, width], outputRange: ['-7deg', '0deg', '7deg'], extrapolate: 'clamp' });
  const likeOpacity = swipeX.interpolate({ inputRange: [0, 32, SWIPE_THRESHOLD], outputRange: [0, 0.55, 1], extrapolate: 'clamp' });
  const passOpacity = swipeX.interpolate({ inputRange: [-SWIPE_THRESHOLD, -32, 0], outputRange: [1, 0.55, 0], extrapolate: 'clamp' });
  const nextScale = swipeX.interpolate({ inputRange: [-width, 0, width], outputRange: [1, 0.96, 1], extrapolate: 'clamp' });

  if (!services) return <Screen><StatePanel title="Chưa thể tải Khám phá" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen><AsyncStatePanel state="loading" title="Đang tìm hồ sơ phù hợp" description="Chỉ dữ liệu công khai đủ điều kiện được tải." /></Screen>;
  if (loadError) return <Screen><AsyncStatePanel state="error" title="Không thể tải Khám phá" description={loadError} actionLabel="Thử lại" onAction={() => void load()} /><AppButton label="Mở bộ lọc" variant="secondary" onPress={() => navigation.navigate('Filters')} /></Screen>;
  if (!candidate) return <Screen><StatePanel title={loadingMore ? 'Đang tìm thêm hồ sơ' : 'Chưa có gợi ý mới'} description="Hãy chỉnh bộ lọc hoặc quay lại sau khi có hồ sơ đủ điều kiện." /><AppButton label="Tải lại" variant="secondary" onPress={() => void load()} /><AppButton label="Mở bộ lọc" onPress={() => navigation.navigate('Filters')} /></Screen>;

  const interestPreview = candidate.interests.slice(0, PREVIEW_INTEREST_COUNT);
  const cardSummary = [candidate.displayName, `${candidate.age} tuổi`, candidate.occupation, candidate.publicLocation, ...interestPreview].filter(Boolean).join(', ');

  return <Screen scroll={false} contentStyle={styles.screen}>
    <View style={styles.deck}>
      {nextCandidate ? <Animated.View pointerEvents="none" style={[styles.nextCard, { transform: [{ scale: nextScale }] }]}>
        <Text style={styles.nextCardLabel}>HỒ SƠ TIẾP THEO</Text>
        <Text numberOfLines={1} style={styles.nextCardName}>{nextCandidate.displayName}, {nextCandidate.age}</Text>
      </Animated.View> : null}
      <Animated.View accessibilityLabel={cardSummary} style={[styles.card, { transform: [{ translateX: swipeX }, { translateY: swipeY }, { rotate: rotation }] }]}
        onTouchStart={(event) => captureSwipeStart(event.nativeEvent.pageX, event.nativeEvent.pageY)}
        onMoveShouldSetResponder={(event) => isHorizontalSwipe(event.nativeEvent.pageX, event.nativeEvent.pageY)}
        onMoveShouldSetResponderCapture={(event) => isHorizontalSwipe(event.nativeEvent.pageX, event.nativeEvent.pageY)}
        onResponderMove={(event) => moveCard(event.nativeEvent.pageX, event.nativeEvent.pageY)}
        onResponderRelease={(event) => finishSwipe(event.nativeEvent.pageX)}
        onResponderTerminate={() => resetCard(true)}
        onTouchEnd={openProfileFromCard}>
        <View style={styles.photoFrame}>
          {visiblePhotoUrl
            ? <Image source={{ uri: visiblePhotoUrl }} style={styles.photo} accessibilityLabel={`Ảnh hồ sơ của ${candidate.displayName}`} />
            : <View style={styles.photoPlaceholder}><AppIcon name={icons.photo} color={colors.inkMuted} size={46} /><Text style={styles.placeholderText}>Chưa có ảnh</Text></View>}
          <Animated.View pointerEvents="none" style={[styles.swipeBadge, styles.likeBadge, { opacity: likeOpacity }]}><Text style={styles.likeBadgeText}>THÍCH</Text></Animated.View>
          <Animated.View pointerEvents="none" style={[styles.swipeBadge, styles.passBadge, { opacity: passOpacity }]}><Text style={styles.passBadgeText}>BỎ QUA</Text></Animated.View>
          {candidate.photos.length > 1 ? <View style={styles.photoCount}><Text style={styles.photoCountText}>{candidate.photos.length} ảnh</Text></View> : null}
        </View>
        <View style={styles.cardContent}>
          <Text numberOfLines={2} style={styles.name}>{candidate.displayName}, {candidate.age}</Text>
          {(candidate.occupation || candidate.publicLocation) ? <View style={styles.metaRow}>
            {candidate.occupation ? <View style={styles.metaItem}><AppIcon name={icons.work} color={colors.inkMuted} size={16} /><Text numberOfLines={1} style={styles.metaText}>{candidate.occupation}</Text></View> : null}
            {candidate.publicLocation ? <View style={styles.metaItem}><AppIcon name={icons.location} color={colors.inkMuted} size={16} /><Text numberOfLines={1} style={styles.metaText}>{candidate.publicLocation}</Text></View> : null}
          </View> : null}
          {candidate.bio ? <Text numberOfLines={2} style={styles.bio}>{candidate.bio}</Text> : null}
          {interestPreview.length ? <View style={styles.chips}>{interestPreview.map((interest) => <View key={interest} style={styles.chip}><Text numberOfLines={1} style={styles.chipText}>{interest}</Text></View>)}</View> : null}
        </View>
      </Animated.View>
    </View>
    {swipeError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{swipeError}</Text> : null}
    {pageError ? <View style={styles.pageError}><Text accessibilityLiveRegion="polite" style={styles.error}>{pageError}</Text><AppButton label="Tải thêm hồ sơ" variant="quiet" disabled={loadingMore} onPress={() => { if (cursor) void load(cursor); }} /></View> : null}
    <View style={styles.actions}>
      <SwipeControl accessibilityLabel="Bỏ qua hồ sơ này" disabled={busy} icon={icons.pass} onPress={() => void swipe('pass')} tone="pass" />
      <SwipeControl accessibilityLabel={`Xem hồ sơ của ${candidate.displayName}`} disabled={busy} icon={icons.profile} onPress={() => navigation.navigate('OtherProfile', { profileId: candidate.id })} tone="profile" />
      <SwipeControl accessibilityLabel={`Thích ${candidate.displayName}`} disabled={busy} icon={icons.like} onPress={() => void swipe('like')} tone="like" />
    </View>
    <Text style={styles.hint}>Vuốt trái để bỏ qua · Vuốt phải để thích</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  headerAction: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  headerActionPressed: { backgroundColor: colors.primarySoft },
  deck: { flex: 1, minHeight: 0, justifyContent: 'center' },
  nextCard: { position: 'absolute', top: 10, right: 12, bottom: 0, left: 12, backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, justifyContent: 'flex-end', padding: spacing.lg, gap: spacing.xs },
  nextCardLabel: { ...type.caption, color: colors.inkMuted, fontWeight: '600' },
  nextCardName: { ...type.subtitle, color: colors.inkMuted },
  card: { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, overflow: 'hidden' },
  photoFrame: { flex: 1.25, minHeight: 200, backgroundColor: colors.surfaceMuted, position: 'relative' },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  placeholderText: { ...type.body, color: colors.inkMuted },
  swipeBadge: { position: 'absolute', top: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 2, borderRadius: radii.sm, backgroundColor: colors.surface },
  likeBadge: { right: spacing.lg, borderColor: colors.primary },
  passBadge: { left: spacing.lg, borderColor: colors.danger },
  likeBadgeText: { ...type.label, color: colors.primaryPressed },
  passBadgeText: { ...type.label, color: colors.danger },
  photoCount: { position: 'absolute', right: spacing.md, bottom: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: 'rgba(16,42,51,0.76)' },
  photoCountText: { ...type.caption, color: colors.onPrimary, fontWeight: '600' },
  cardContent: { padding: spacing.lg, gap: spacing.sm },
  name: { ...type.display, color: colors.ink },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
  metaText: { ...type.caption, color: colors.inkMuted, flexShrink: 1 },
  bio: { ...type.body, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { maxWidth: '100%', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.primarySoft },
  chipText: { ...type.caption, color: colors.primaryPressed, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: spacing.xl },
  actionControl: { width: 58, height: 58, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  actionPass: { backgroundColor: colors.surface, borderColor: colors.danger },
  actionProfile: { backgroundColor: colors.surface, borderColor: colors.primary },
  actionLike: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  actionDisabled: { backgroundColor: colors.disabled, borderColor: colors.border },
  hint: { ...type.caption, color: colors.inkMuted, textAlign: 'center' },
  error: { ...type.caption, color: colors.danger, textAlign: 'center' },
  pageError: { alignItems: 'center', gap: spacing.xxs },
});
