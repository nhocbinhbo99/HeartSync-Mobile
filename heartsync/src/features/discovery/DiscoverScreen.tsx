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
import { getProfileImageSource } from '../../shared/utils/avatarHelper';
import { feedback } from '../../shared/motion/feedback';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Discover'>,
  NativeStackScreenProps<RootStackParamList>
>;
type IconName = ComponentProps<typeof AppIcon>['name'];

const SWIPE_THRESHOLD = 90;
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
            ? [...current, ...result.data.items.filter((profile) => !current.some((item) => item.id === profile.id))]
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
  const visiblePhotoUrl = photoUrl && photoPath && photoUrl.storagePath === photoPath ? photoUrl.url : null;

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
      .activeOffsetX([-12, 12])
      .onUpdate((event) => {
        swipeX.setValue(event.translationX);
        swipeY.setValue(event.translationY * 0.2);
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
    outputRange: ['-9deg', '0deg', '9deg'],
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
    outputRange: [1, 0.94, 1],
    extrapolate: 'clamp',
  });

  const header = (
    <View style={styles.topBar}>
      <View style={styles.brandRow}>
        <View style={styles.brandBadge}>
          <AppIcon name="heart" color={colors.primary} size={18} />
        </View>
        <Text accessibilityRole="header" style={styles.brandTitle}>
          Khám phá
        </Text>
      </View>
      <IconButton
        icon="filter"
        label="Mở bộ lọc khám phá"
        tone="primary"
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
      <Screen safeTop>
        {header}
        <View style={styles.emptyWrap}>
          <View style={styles.emptyHeartCard}>
            <AppIcon name="heartOutline" color={colors.primary} size={42} />
          </View>
          <StatePanel
            title={loadingMore ? 'Đang tải thêm kết nối' : 'Chưa có gợi ý mới'}
            description="Hãy thử mở rộng khoảng tuổi hoặc ngôn ngữ trong bộ lọc để khám phá thêm nhiều bạn mới nhé."
          />
          <AppButton label="Điều chỉnh bộ lọc" onPress={() => navigation.navigate('Filters')} />
          <AppButton label="Tải lại" variant="quiet" onPress={() => void load()} />
        </View>
      </Screen>
    );
  }

  const interestPreview = candidate.interests.slice(0, PREVIEW_INTEREST_COUNT);
  const cardSummary = [
    candidate.displayName,
    `${candidate.age} tuổi`,
    candidate.occupation,
    candidate.publicLocation,
    ...interestPreview,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Screen scroll={false} safeTop contentStyle={styles.screen}>
      {header}
      <View style={styles.deck}>
        {nextCandidate ? (
          <Animated.View pointerEvents="none" style={[styles.card, styles.nextCard, { transform: [{ scale: nextScale }] }]}>
            <Image
              source={getProfileImageSource(undefined, nextCandidate.id, nextCandidate.gender)}
              style={styles.photo}
            />
            <View style={styles.gradientOverlay} />
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
              source={getProfileImageSource(visiblePhotoUrl, candidate.id, candidate.gender)}
              style={styles.photo}
              accessibilityLabel={`Ảnh đại diện của ${candidate.displayName}`}
            />

            <View style={styles.gradientOverlay} />

            <Animated.View pointerEvents="none" style={[styles.swipeBadge, styles.likeBadge, { opacity: likeOpacity }]}>
              <Text style={styles.likeBadgeText}>THÍCH</Text>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.swipeBadge, styles.passBadge, { opacity: passOpacity }]}>
              <Text style={styles.passBadgeText}>BỎ QUA</Text>
            </Animated.View>

            {candidate.photos.length > 1 ? (
              <View style={styles.photoCount}>
                <Text style={styles.photoCountText}>{candidate.photos.length} ảnh</Text>
              </View>
            ) : null}

            <View style={styles.cardContent}>
              <View style={styles.nameRow}>
                <Text numberOfLines={1} style={styles.name}>
                  {candidate.displayName}, {candidate.age}
                </Text>
                <View style={styles.verifiedBadge}>
                  <AppIcon name="check" color="#FFFFFF" size={13} />
                </View>
              </View>

              {candidate.occupation || candidate.publicLocation ? (
                <View style={styles.metaRow}>
                  {candidate.occupation ? (
                    <View style={styles.metaItem}>
                      <AppIcon name="shield" color="#FFFFFF" size={14} />
                      <Text numberOfLines={1} style={styles.metaText}>
                        {candidate.occupation}
                      </Text>
                    </View>
                  ) : null}
                  {candidate.publicLocation ? (
                    <View style={styles.metaItem}>
                      <AppIcon name="location" color="#FFFFFF" size={14} />
                      <Text numberOfLines={1} style={styles.metaText}>
                        {candidate.publicLocation}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {candidate.bio ? (
                <Text numberOfLines={2} style={styles.bio}>
                  {candidate.bio}
                </Text>
              ) : null}

              {interestPreview.length ? (
                <View style={styles.chips}>
                  {interestPreview.map((interest) => (
                    <View key={interest} style={styles.chip}>
                      <Text numberOfLines={1} style={styles.chipText}>
                        {interest}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
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
          iconColor="#E6A23C"
          bgColor="#FFFBF0"
          size={50}
          label="Quay lại"
          disabled={busy}
          onPress={() => resetCard(true)}
        />
        <ActionButton
          icon="close"
          iconColor="#FF4949"
          bgColor="#FFF0F0"
          size={60}
          label="Bỏ qua"
          disabled={busy}
          onPress={() => void swipe('pass')}
        />
        <ActionButton
          icon="star"
          iconColor="#3A8DFF"
          bgColor="#EFF6FF"
          size={50}
          label="Xem chi tiết"
          disabled={busy}
          onPress={openProfile}
        />
        <ActionButton
          icon="heart"
          iconColor="#FFFFFF"
          bgColor={colors.primary}
          size={64}
          label="Thích"
          disabled={busy}
          isMain
          onPress={() => void swipe('like')}
        />
      </View>

      <Text style={styles.hint}>Chạm thẻ để xem chi tiết · Vuốt trái bỏ qua · Vuốt phải thích</Text>
    </Screen>
  );
}

function ActionButton({
  icon,
  iconColor,
  bgColor,
  size,
  label,
  disabled,
  isMain = false,
  onPress,
}: {
  icon: IconName;
  iconColor: string;
  bgColor: string;
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
          backgroundColor: bgColor,
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  brandBadge: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
  },
  filterButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyHeartCard: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deck: {
    flex: 1,
    minHeight: 430,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '99%',
    height: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    position: 'absolute',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
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
    height: '46%',
    backgroundColor: 'rgba(32, 12, 24, 0.68)',
  },
  swipeBadge: {
    position: 'absolute',
    top: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 2.5,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
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
  photoCount: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  photoCountText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  cardContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    fontFamily: fonts.extrabold,
    fontSize: 26,
    lineHeight: 32,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.xxs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.92)',
  },
  bio: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxs,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mainActionShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  actionPressed: {
    transform: [{ scale: 0.9 }],
  },
  actionDisabled: {
    opacity: 0.5,
  },
  hint: {
    ...type.caption,
    fontSize: 11,
    color: colors.inkMuted,
    textAlign: 'center',
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
