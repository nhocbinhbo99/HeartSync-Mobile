import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { Animated, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { Avatar } from '../../shared/components/Avatar';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { IconButton } from '../../shared/components/IconButton';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { useSnackbar } from '../../shared/components/Snackbar';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { ProfilePublic, SwipeAction } from '../../shared/types/domain.types';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Discover'>, NativeStackScreenProps<RootStackParamList>>;
type IconName = ComponentProps<typeof AppIcon>['name'];

const SWIPE_THRESHOLD = 88;
const PREVIEW_INTEREST_COUNT = 3;

const icons = {
  pass: { ios: 'xmark', android: 'close', web: 'close' },
  like: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  location: { ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' },
  work: { ios: 'briefcase.fill', android: 'work', web: 'work' },
} as const satisfies Record<string, IconName>;

type SwipeControlProps = {
  accessibilityLabel: string;
  disabled: boolean;
  icon: IconName;
  onPress: () => void;
  tone: 'pass' | 'save' | 'like';
};

function SwipeControl({ accessibilityLabel, disabled, icon, onPress, tone }: SwipeControlProps) {
  const iconColor = tone === 'like' ? colors.onPrimary : tone === 'pass' ? colors.danger : colors.primaryPressed;
  const toneStyle = tone === 'like' ? styles.actionLike : tone === 'pass' ? styles.actionPass : styles.actionSave;
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} disabled={disabled}
    onPress={onPress} rippleColor={tone === 'like' ? 'rgba(255,255,255,0.22)' : 'rgba(230,56,111,0.12)'} style={[styles.actionControl, toneStyle, disabled && styles.actionDisabled]}>
    <AppIcon name={icon} color={iconColor} size={25} />
  </AnimatedPressable>;
}

export function DiscoverScreen({ navigation }: Props) {
  const services = useAppServices();
  const snackbar = useSnackbar();
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
  const [saving, setSaving] = useState(false);
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

  const saveCandidate = async () => {
    if (!services || !candidate || saving) return;
    setSaving(true);
    const result = await services.saved.setSaved(candidate.id, true);
    setSaving(false);
    if (!result.ok) {
      snackbar.show({ message: result.error.message, tone: 'error' });
      return;
    }
    snackbar.show({ message: `Đã lưu ${candidate.displayName} để xem lại sau.`, tone: 'success' });
  };

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

  const header = <DiscoverHeader onOpenFilters={() => navigation.navigate('Filters')} />;
  if (!services) return <Screen safeTop>{header}<StatePanel title="Chưa thể tải Khám phá" description="Cấu hình dịch vụ đang thiếu." /></Screen>;
  if (loading) return <Screen safeTop>{header}<AsyncStatePanel state="loading" title="Đang tìm hồ sơ phù hợp" description="Chỉ dữ liệu công khai đủ điều kiện được tải." /></Screen>;
  if (loadError) return <Screen safeTop>{header}<AsyncStatePanel state="error" title="Không thể tải Khám phá" description={loadError} actionLabel="Thử lại" onAction={() => void load()} /><AppButton label="Mở bộ lọc" variant="secondary" onPress={() => navigation.navigate('Filters')} /></Screen>;
  if (!candidate) return <Screen safeTop>{header}<EmptyDiscoveryState loading={loadingMore} onReload={() => void load()} onOpenFilters={() => navigation.navigate('Filters')} /></Screen>;

  const interestPreview = candidate.interests.slice(0, PREVIEW_INTEREST_COUNT);
  const cardSummary = [candidate.displayName, `${candidate.age} tuổi`, candidate.occupation, candidate.publicLocation, ...interestPreview].filter(Boolean).join(', ');

  return <Screen scroll={false} safeTop contentStyle={styles.screen}>
    {header}
    <View style={styles.deck}>
      {nextCandidate ? <Animated.View pointerEvents="none" style={[styles.nextCard, { transform: [{ scale: nextScale }] }]}>
        <AppText variant="caption" tone="muted">Hồ sơ tiếp theo</AppText>
        <AppText numberOfLines={1} variant="subtitle" tone="muted">{nextCandidate.displayName}, {nextCandidate.age}</AppText>
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
            : <View style={styles.photoPlaceholder}><Avatar label={candidate.displayName} size={72} /><AppText variant="caption" tone="muted">Chưa có ảnh</AppText></View>}
          <Animated.View pointerEvents="none" style={[styles.swipeBadge, styles.likeBadge, { opacity: likeOpacity }]}><Text style={styles.likeBadgeText}>Thích</Text></Animated.View>
          <Animated.View pointerEvents="none" style={[styles.swipeBadge, styles.passBadge, { opacity: passOpacity }]}><Text style={styles.passBadgeText}>Bỏ qua</Text></Animated.View>
          {candidate.publicLocation ? <View style={styles.locationBadge}><AppIcon name={icons.location} color={colors.primaryPressed} size={18} /><Text numberOfLines={1} style={styles.locationBadgeText}>{candidate.publicLocation}</Text></View> : null}
          {candidate.photos.length > 1 ? <View style={styles.photoCount}><Text style={styles.photoCountText}>{candidate.photos.length} ảnh</Text></View> : null}
          <View style={styles.photoDetails}>
            <Text numberOfLines={2} style={styles.name}>{candidate.displayName}, {candidate.age}</Text>
            {candidate.occupation ? <View style={styles.metaItem}><AppIcon name={icons.work} color={colors.onPrimary} size={17} /><Text numberOfLines={1} style={styles.metaText}>{candidate.occupation}</Text></View> : null}
            {interestPreview.length ? <Text numberOfLines={1} style={styles.interestLine}>{interestPreview.join(' · ')}</Text> : null}
            <AppButton label="Xem hồ sơ" variant="secondary" trailingIcon="forward" onPress={() => navigation.navigate('OtherProfile', { profileId: candidate.id })} style={styles.viewProfile} />
          </View>
        </View>
      </Animated.View>
    </View>
    {swipeError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{swipeError}</Text> : null}
    {pageError ? <View style={styles.pageError}><Text accessibilityLiveRegion="polite" style={styles.error}>{pageError}</Text><AppButton label="Tải thêm hồ sơ" variant="quiet" disabled={loadingMore} onPress={() => { if (cursor) void load(cursor); }} /></View> : null}
    <View style={styles.actions}>
      <SwipeControl accessibilityLabel="Bỏ qua hồ sơ này" disabled={busy || saving} icon={icons.pass} onPress={() => void swipe('pass')} tone="pass" />
      <SwipeControl accessibilityLabel={`Thích ${candidate.displayName}`} disabled={busy || saving} icon={icons.like} onPress={() => void swipe('like')} tone="like" />
      <SwipeControl accessibilityLabel={`Lưu ${candidate.displayName}`} disabled={busy || saving} icon="bookmark" onPress={() => void saveCandidate()} tone="save" />
    </View>
  </Screen>;
}

function DiscoverHeader({ onOpenFilters }: { onOpenFilters: () => void }) {
  return <View style={styles.header}>
    <View style={styles.headerCopy}><AppText accessibilityRole="header" variant="heading">Khám phá</AppText><AppText tone="muted">Tìm một người hợp nhịp với bạn.</AppText></View>
    <IconButton icon="filter" label="Mở bộ lọc khám phá" tone="primary" onPress={onOpenFilters} style={styles.filterButton} />
  </View>;
}

function EmptyDiscoveryState({ loading, onReload, onOpenFilters }: { loading: boolean; onReload: () => void; onOpenFilters: () => void }) {
  return <View style={styles.emptyState}>
    <View accessible accessibilityRole="image" accessibilityLabel="Chưa có gợi ý mới" style={styles.emptyArtwork}>
      <View pointerEvents="none" accessible={false} style={[styles.emptyOrb, styles.emptyOrbLeft]} />
      <View pointerEvents="none" accessible={false} style={[styles.emptyOrb, styles.emptyOrbRight]} />
      <View pointerEvents="none" accessible={false} style={styles.emptyHeart}><AppIcon name="heartOutline" color={colors.primaryPressed} size={46} /></View>
    </View>
    <AppText accessibilityRole="header" variant="heading" style={styles.emptyTitle}>{loading ? 'Đang tìm thêm người phù hợp.' : 'Tạm thời chưa có ai phù hợp với bộ lọc.'}</AppText>
    <AppText tone="muted" style={styles.emptyCopy}>Thử mở rộng độ tuổi hoặc khoảng cách để gặp thêm những người thú vị nhé.</AppText>
    <AppButton label="Điều chỉnh bộ lọc" onPress={onOpenFilters} />
    {loading ? null : <AnimatedPressable accessibilityRole="button" accessibilityLabel="Tải lại gợi ý" onPress={onReload} style={styles.emptyReload}>
      <AppText variant="label" tone="primary">Tải lại</AppText>
    </AnimatedPressable>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  headerCopy: { flex: 1, gap: spacing.xxs },
  filterButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  deck: { flex: 1, minHeight: 0, justifyContent: 'center', paddingHorizontal: spacing.xxs },
  nextCard: { position: 'absolute', top: 12, right: 14, bottom: 0, left: 14, backgroundColor: colors.primarySoft, borderRadius: 24, justifyContent: 'flex-end', padding: spacing.lg, gap: spacing.xs },
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: 26, overflow: 'hidden' },
  photoFrame: { flex: 1, minHeight: 300, backgroundColor: colors.surfaceMuted, position: 'relative' },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  swipeBadge: { position: 'absolute', top: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 2, borderRadius: radii.sm, backgroundColor: colors.surface },
  likeBadge: { right: spacing.lg, borderColor: colors.primary },
  passBadge: { left: spacing.lg, borderColor: colors.danger },
  likeBadgeText: { ...type.label, color: colors.primaryPressed },
  passBadgeText: { ...type.label, color: colors.danger },
  locationBadge: { position: 'absolute', top: spacing.md, left: spacing.md, maxWidth: '76%', backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: spacing.sm, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  locationBadgeText: { ...type.label, color: colors.primaryPressed, flexShrink: 1 },
  photoCount: { position: 'absolute', right: spacing.md, top: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: 'rgba(59,16,36,0.76)' },
  photoCountText: { ...type.caption, color: colors.onPrimary, fontWeight: '600' },
  photoDetails: { position: 'absolute', right: 0, bottom: 0, left: 0, padding: spacing.lg, paddingTop: spacing.xxl, gap: spacing.xs, backgroundColor: 'rgba(59,16,36,0.78)' },
  name: { ...type.display, fontSize: 34, lineHeight: 40, color: colors.onPrimary },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
  metaText: { ...type.body, color: colors.onPrimary, flexShrink: 1 },
  interestLine: { ...type.body, color: colors.onPrimary },
  viewProfile: { alignSelf: 'flex-start', minHeight: 48, marginTop: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.md },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: spacing.xl, paddingVertical: spacing.xs },
  actionControl: { width: 62, height: 62, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  actionPass: { backgroundColor: colors.surface, borderColor: colors.danger },
  actionSave: { backgroundColor: colors.surface, borderColor: colors.primary },
  actionLike: { width: 80, height: 80, backgroundColor: colors.primary, borderColor: colors.primary },
  actionDisabled: { backgroundColor: colors.disabled, borderColor: colors.border },
  error: { ...type.caption, color: colors.danger, textAlign: 'center' },
  pageError: { alignItems: 'center', gap: spacing.xxs },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  emptyArtwork: { width: '74%', aspectRatio: 1, borderRadius: 28, backgroundColor: '#FFE8EF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: spacing.md },
  emptyOrb: { position: 'absolute', width: 124, height: 124, borderRadius: radii.pill, backgroundColor: colors.surface },
  emptyOrbLeft: { transform: [{ translateX: -50 }] },
  emptyOrbRight: { transform: [{ translateX: 50 }] },
  emptyHeart: { width: 88, height: 88, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 7, borderColor: colors.primaryPressed, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { textAlign: 'center', fontSize: 30, lineHeight: 38 },
  emptyCopy: { textAlign: 'center', fontSize: 17, lineHeight: 25 },
  emptyReload: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, marginTop: -spacing.sm },
});
