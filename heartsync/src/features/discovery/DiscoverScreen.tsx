import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useAppServices } from '../../services/AppServicesProvider';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { IconButton } from '../../shared/components/IconButton';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, fonts, radii, spacing, type } from '../../shared/theme/tokens';
import type { ProfilePublic, SwipeAction } from '../../shared/types/domain.types';
import {
  brandAssets,
  formatNaturalBio,
  formatNaturalOccupation,
  getProfileImageSource,
} from '../../shared/utils/avatarHelper';
import { feedback } from '../../shared/motion/feedback';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Discover'>,
  NativeStackScreenProps<RootStackParamList>
>;
type IconName = ComponentProps<typeof AppIcon>['name'];

const SWIPE_THRESHOLD = 88;
const PREVIEW_INTEREST_COUNT = 3;

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
  const requestRef = useRef(0);

  const [swipeX] = useState(() => new Animated.Value(0));
  const [swipeY] = useState(() => new Animated.Value(0));

  const resetCard = useCallback(
    (animated = false) => {
      if (!animated) {
        swipeX.setValue(0);
        swipeY.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, friction: 6, tension: 80 }),
        Animated.spring(swipeY, { toValue: 0, useNativeDriver: true, friction: 6, tension: 80 }),
      ]).start();
    },
    [swipeX, swipeY],
  );

  const load = useCallback(
    async (nextCursor?: string) => {
      if (!services) return;
      const request = ++requestRef.current;
      if (nextCursor) {
        setLoadingMore(true);
        setPageError('');
      } else {
        setLoading(true);
        setCandidates([]);
        setCursor(null);
        setLoadError('');
      }
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
        setCandidates((current) =>
          nextCursor
            ? [
                ...current,
                ...result.data.items.filter((profile) => !current.some((item) => item.id === profile.id)),
              ]
            : result.data.items,
        );
        setCursor(result.data.nextCursor);
      } catch {
        if (request === requestRef.current) {
          if (nextCursor) setPageError('Không thể tải thêm hồ sơ. Vui lòng thử lại.');
          else setLoadError('Không thể tải hồ sơ. Vui lòng thử lại.');
        }
      } finally {
        if (request === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [services],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestRef.current += 1;
      };
    }, [load]),
  );

  const candidate = candidates[0];
  const nextCandidate = candidates[1];
  const photo = candidate?.photos.find((item) => item.isPrimary) ?? candidate?.photos[0];
  const photoPath = photo?.storagePath;
  const visiblePhotoUrl =
    photoUrl && photoPath && photoUrl.storagePath === photoPath ? photoUrl.url : null;

  useEffect(() => {
    let active = true;
    if (photoPath && services) {
      void services.profile.createPhotoUrl(photoPath).then((result) => {
        if (active && result.ok) setPhotoUrl({ storagePath: photoPath, url: result.data });
      });
    }
    return () => {
      active = false;
    };
  }, [photoPath, services]);

  useEffect(() => {
    if (!loading && !loadingMore && candidates.length > 0 && candidates.length <= 2 && cursor) {
      const timer = setTimeout(() => void load(cursor), 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [candidates.length, cursor, load, loading, loadingMore]);

  const swipe = useCallback(
    async (action: SwipeAction) => {
      const current = candidate;
      if (!services || !current || busy) return;
      setBusy(true);
      setSwipeError('');
      const direction = action === 'like' ? 1 : -1;
      const flyDistance = Math.max(width + 100, 480) * direction;

      feedback(action === 'like' ? 'selection' : 'toggleOff');

      Animated.parallel([
        Animated.timing(swipeX, { toValue: flyDistance, duration: 220, useNativeDriver: true }),
        Animated.timing(swipeY, { toValue: -15, duration: 220, useNativeDriver: true }),
      ]).start(async () => {
        try {
          const result = await services.matches.recordSwipe(current.id, action);
          if (!result.ok) {
            setSwipeError(result.error.message);
            resetCard(true);
            return;
          }
          resetCard();
          setCandidates((items) => (items[0]?.id === current.id ? items.slice(1) : items));
          if (result.data.outcome === 'matched') {
            feedback('confirm');
            navigation.navigate('MatchFound', { matchId: result.data.matchId });
          }
        } catch {
          setSwipeError('Không thể lưu thao tác. Vui lòng thử lại.');
          resetCard(true);
        } finally {
          setBusy(false);
        }
      });
    },
    [busy, candidate, navigation, resetCard, services, swipeX, swipeY, width],
  );

  const openProfile = useCallback(() => {
    if (!busy && candidate) {
      navigation.navigate('OtherProfile', { profileId: candidate.id });
    }
  }, [busy, candidate, navigation]);

  const cardGesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .runOnJS(true)
      .enabled(!busy)
      .activeOffsetX([-10, 10])
      .onUpdate((event) => {
        swipeX.setValue(event.translationX);
        swipeY.setValue(event.translationY * 0.18);
      })
      .onEnd((event) => {
        if (event.translationX > SWIPE_THRESHOLD) {
          void swipe('like');
        } else if (event.translationX < -SWIPE_THRESHOLD) {
          void swipe('pass');
        } else {
          resetCard(true);
        }
      });

    const tapGesture = Gesture.Tap()
      .runOnJS(true)
      .enabled(!busy)
      .maxDistance(10)
      .onEnd(() => {
        openProfile();
      });

    return Gesture.Exclusive(panGesture, tapGesture);
  }, [busy, openProfile, resetCard, swipe, swipeX, swipeY]);

  const rotation = swipeX.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });
  const likeOpacity = swipeX.interpolate({
    inputRange: [0, 30, SWIPE_THRESHOLD],
    outputRange: [0, 0.45, 1],
    extrapolate: 'clamp',
  });
  const passOpacity = swipeX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -30, 0],
    outputRange: [1, 0.45, 0],
    extrapolate: 'clamp',
  });
  const nextScale = swipeX.interpolate({
    inputRange: [-width, 0, width],
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp',
  });

  const header = (
    <View style={styles.topBar}>
      <Text accessibilityRole="header" style={styles.brandTitle}>
        Khám phá
      </Text>
      <IconButton
        icon="filter"
        label="Mở bộ lọc khám phá"
        onPress={() => navigation.navigate('Filters')}
        style={styles.filterButton}
      />
    </View>
  );

  if (!services) {
    return (
      <Screen safeTop>
        {header}
        <StatePanel title="Chưa thể tải Khám phá" description="Cấu hình dịch vụ đang thiếu." />
      </Screen>
    );
  }
  if (loading) {
    return (
      <Screen safeTop>
        {header}
        <AsyncStatePanel
          state="loading"
          title="Đang tìm kiếm hồ sơ phù hợp"
          description="HeartSync đang chọn lọc các kết nối dành cho bạn."
        />
      </Screen>
    );
  }
  if (loadError) {
    return (
      <Screen safeTop>
        {header}
        <AsyncStatePanel
          state="error"
          title="Không thể tải Khám phá"
          description={loadError}
          actionLabel="Thử lại"
          onAction={() => void load()}
        />
        <AppButton label="Mở bộ lọc" variant="secondary" onPress={() => navigation.navigate('Filters')} />
      </Screen>
    );
  }
  if (!candidate) {
    return (
      <Screen safeTop contentStyle={styles.emptyScreen}>
        {header}
        <View style={styles.emptyWrap}>
          <Image
            source={brandAssets.onboardingCouple}
            style={styles.emptyIllustration}
            resizeMode="contain"
          />
          <View style={styles.emptyCopyWrap}>
            <Text style={styles.emptyTitle}>
              {loadingMore ? 'Đang tải thêm kết nối...' : 'Chưa có gợi ý mới'}
            </Text>
            <Text style={styles.emptyBody}>
              Hãy thử mở rộng khoảng tuổi hoặc ngôn ngữ trong bộ lọc để khám phá thêm nhiều bạn mới hợp tần số nhé.
            </Text>
          </View>
          <View style={styles.emptyActions}>
            <AppButton label="Điều chỉnh bộ lọc" onPress={() => navigation.navigate('Filters')} />
            <AppButton label="Tải lại danh sách" variant="secondary" onPress={() => void load()} />
          </View>
        </View>
      </Screen>
    );
  }

  const defaultInterests = ['Du lịch', 'Âm nhạc', 'Cà phê'];
  const interestPreview =
    candidate.interests.length > 0
      ? candidate.interests.slice(0, PREVIEW_INTEREST_COUNT)
      : defaultInterests;
  const displayOccupation = formatNaturalOccupation(candidate.occupation, candidate.id);
  const displayBio = formatNaturalBio(candidate.bio, candidate.id);
  const locationLabel = candidate.publicLocation || 'TP. Hồ Chí Minh';

  const cardSummary = [
    candidate.displayName,
    `${candidate.age} tuổi`,
    displayOccupation,
    locationLabel,
    ...interestPreview,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Screen scroll={false} safeTop contentStyle={styles.screen}>
      {header}
      <View style={styles.deck}>
        {nextCandidate ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.card, styles.nextCard, { transform: [{ scale: nextScale }] }]}
          >
            <Image
              source={getProfileImageSource(
                undefined,
                nextCandidate.id,
                nextCandidate.gender,
                nextCandidate.displayName,
              )}
              style={styles.photo}
            />
            <Image
              source={brandAssets.cardScrimGradient}
              style={styles.gradientOverlay}
              resizeMode="stretch"
            />
            <View style={styles.cardContent}>
              <Text numberOfLines={1} style={styles.name}>
                {nextCandidate.displayName}, {nextCandidate.age}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        <GestureDetector gesture={cardGesture}>
          <Animated.View
            accessibilityLabel={cardSummary}
            style={[
              styles.card,
              { transform: [{ translateX: swipeX }, { translateY: swipeY }, { rotate: rotation }] },
            ]}
          >
            <Image
              source={getProfileImageSource(
                visiblePhotoUrl,
                candidate.id,
                candidate.gender,
                candidate.displayName,
              )}
              style={styles.photo}
              accessibilityLabel={`Ảnh đại diện của ${candidate.displayName}`}
            />

            <Image
              source={brandAssets.cardScrimGradient}
              style={styles.gradientOverlay}
              resizeMode="stretch"
            />

            <Animated.View
              pointerEvents="none"
              style={[styles.swipeBadge, styles.likeBadge, { opacity: likeOpacity }]}
            >
              <Text style={styles.likeBadgeText}>THÍCH</Text>
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[styles.swipeBadge, styles.passBadge, { opacity: passOpacity }]}
            >
              <Text style={styles.passBadgeText}>BỎ QUA</Text>
            </Animated.View>

            <View style={styles.cardContent}>
              <View style={styles.nameRow}>
                <Text numberOfLines={1} style={styles.name}>
                  {candidate.displayName}, {candidate.age}
                </Text>
                <View style={styles.verifiedBadge}>
                  <AppIcon name="check" color="#FFFFFF" size={12} />
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <AppIcon name="location" color="#FF8FAB" size={15} />
                  <Text numberOfLines={1} style={styles.metaText}>
                    {locationLabel}
                  </Text>
                </View>
                <Text style={styles.metaDot}>•</Text>
                <Text numberOfLines={1} style={styles.metaText}>
                  {displayOccupation}
                </Text>
              </View>

              <Text numberOfLines={2} style={styles.bio}>
                {displayBio}
              </Text>

              <View style={styles.chips}>
                {interestPreview.map((interest) => (
                  <View key={interest} style={styles.chip}>
                    <Text numberOfLines={1} style={styles.chipText}>
                      {interest}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      {swipeError ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {swipeError}
        </Text>
      ) : null}
      {pageError ? (
        <View style={styles.pageError}>
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {pageError}
          </Text>
          <AppButton
            label="Tải thêm hồ sơ"
            variant="quiet"
            disabled={loadingMore}
            onPress={() => {
              if (cursor) void load(cursor);
            }}
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        <ActionButton
          icon="refresh"
          iconColor="#3D2B35"
          size={50}
          label="Quay lại"
          disabled={busy}
          onPress={() => resetCard(true)}
        />
        <ActionButton
          icon="close"
          iconColor="#FF4D7D"
          size={60}
          label="Bỏ qua"
          disabled={busy}
          onPress={() => void swipe('pass')}
        />
        <ActionButton
          icon="heart"
          iconColor="#FF3868"
          size={60}
          label="Thích"
          disabled={busy}
          isMain
          onPress={() => void swipe('like')}
        />
        <ActionButton
          icon="star"
          iconColor="#2B8CFF"
          size={50}
          label="Xem chi tiết"
          disabled={busy}
          onPress={openProfile}
        />
      </View>
    </Screen>
  );
}

function ActionButton({
  icon,
  iconColor,
  size,
  label,
  disabled,
  isMain = false,
  onPress,
}: {
  icon: IconName;
  iconColor: string;
  size: number;
  label: string;
  disabled: boolean;
  isMain?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        isMain && styles.mainActionShadow,
        pressed && !disabled && styles.actionPressed,
        disabled && styles.actionDisabled,
      ]}
    >
      <AppIcon name={icon} color={iconColor} size={size * 0.44} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: 4,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    justifyContent: 'space-between',
    backgroundColor: '#FFF7F9',
  },
  emptyScreen: {
    paddingTop: 4,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#FFF7F9',
  },
  topBar: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  brandTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 26,
    lineHeight: 32,
    color: colors.ink,
  },
  filterButton: {
    backgroundColor: 'transparent',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyIllustration: {
    width: 220,
    height: 220,
  },
  emptyCopyWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  emptyActions: {
    width: '100%',
    gap: spacing.sm,
  },
  deck: {
    flex: 1,
    minHeight: 440,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#24111A',
    position: 'absolute',
    shadowColor: '#D65B88',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 7,
  },
  nextCard: {
    zIndex: 0,
    opacity: 0.92,
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    position: 'absolute',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '58%',
  },
  swipeBadge: {
    position: 'absolute',
    top: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 2.5,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    zIndex: 10,
  },
  likeBadge: {
    right: spacing.lg,
    borderColor: colors.primary,
    transform: [{ rotate: '12deg' }],
  },
  passBadge: {
    left: spacing.lg,
    borderColor: colors.danger,
    transform: [{ rotate: '-12deg' }],
  },
  likeBadgeText: {
    fontFamily: fonts.extrabold,
    fontSize: 18,
    color: colors.primary,
  },
  passBadgeText: {
    fontFamily: fonts.extrabold,
    fontSize: 18,
    color: colors.danger,
  },
  cardContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 28,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: fonts.extrabold,
    fontSize: 28,
    lineHeight: 34,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.verified,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDot: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.72)',
  },
  metaText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.94)',
  },
  bio: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.86)',
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(28, 16, 22, 0.56)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  chipText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingTop: 4,
    paddingBottom: 2,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCE8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D65B88',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  mainActionShadow: {
    shadowColor: '#FF3868',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  actionPressed: {
    transform: [{ scale: 0.91 }],
  },
  actionDisabled: {
    opacity: 0.5,
  },
  error: {
    ...type.caption,
    color: colors.danger,
    textAlign: 'center',
  },
  pageError: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
});
