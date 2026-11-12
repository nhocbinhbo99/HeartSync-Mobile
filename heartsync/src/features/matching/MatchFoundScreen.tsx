import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAppServices } from '../../services/AppServicesProvider';
import { getCachedPhotoUrl, resolvePhotoUrls } from '../../services/photoCache';
import { AnimatedSection } from '../../shared/components/AnimatedSection';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { feedback } from '../../shared/motion/feedback';
import { claimMatchCelebration } from './matchCelebrationGuard';
import { colors, fonts, spacing } from '../../shared/theme/tokens';
import type { ProfilePublic } from '../../shared/types/domain.types';
import type { RootStackParamList } from '../../navigation/types';
import { brandAssets, getProfileImageSource } from '../../shared/utils/avatarHelper';

type MatchPeople = {
  matchId: string;
  other: ProfilePublic;
  mine: ProfilePublic;
  otherPhoto?: string;
  myPhoto?: string;
};

export function MatchFoundScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'MatchFound'>) {
  const services = useAppServices();
  const matchId = route.params?.matchId;
  const [people, setPeople] = useState<MatchPeople>();

  useEffect(() => {
    if (matchId) {
      claimMatchCelebration(matchId);
      feedback('confirm');
    }
  }, [matchId]);

  useEffect(() => {
    let live = true;
    if (!services || !matchId)
      return () => {
        live = false;
      };
    void Promise.all([services.matches.listMatches(), services.profile.getMine()]).then(
      async ([matches, mine]) => {
        if (!live || !matches.ok || !mine.ok) return;
        const match = matches.data.items.find((item) => item.id === matchId);
        if (!match) return;
        const otherPath = (
          match.otherProfile.photos.find((photo) => photo.isPrimary) ?? match.otherProfile.photos[0]
        )?.storagePath;
        const myPath = (
          mine.data.public.photos.find((photo) => photo.isPrimary) ?? mine.data.public.photos[0]
        )?.storagePath;
        const urlMap = await resolvePhotoUrls(services.profile, [otherPath, myPath]);
        if (!live) return;
        setPeople({
          matchId,
          other: match.otherProfile,
          mine: mine.data.public,
          otherPhoto: otherPath ? (urlMap[otherPath] ?? getCachedPhotoUrl(otherPath)) : undefined,
          myPhoto: myPath ? (urlMap[myPath] ?? getCachedPhotoUrl(myPath)) : undefined,
        });
      },
    );
    return () => {
      live = false;
    };
  }, [matchId, services]);

  if (!matchId) {
    return (
      <Screen safeTop>
        <StatePanel
          title="Chưa có match được xác nhận"
          description="Match chỉ xuất hiện sau khi cả hai bạn cùng thích nhau."
        />
        <AppButton label="Quay lại" variant="quiet" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const visiblePeople = people?.matchId === matchId ? people : undefined;
  const otherName = visiblePeople?.other.displayName ?? 'người ấy';

  return (
    <Screen scroll={false} safeTop contentStyle={styles.screen}>
      <View style={styles.brandHeader}>
        <Image source={brandAssets.logoPink} style={styles.brandLogo} resizeMode="contain" />
        <AppText style={styles.brandWordmark}>HeartSync</AppText>
      </View>

      <AnimatedSection>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Kết nối mới với ${otherName}`}
          style={styles.stage}
        >
          <View style={styles.softAuraOuter} />
          <View style={styles.softAuraInner} />

          <View style={[styles.floatingHeart, { top: 18, left: 48 }]}>
            <AppIcon name="heart" color="#FF6F9C" size={18} />
          </View>
          <View style={[styles.floatingHeart, { top: 8, right: 64 }]}>
            <AppIcon name="heart" color="#FF4D7D" size={22} />
          </View>
          <View style={[styles.floatingHeart, { bottom: 26, left: 36 }]}>
            <AppIcon name="heart" color="#FF8FAB" size={16} />
          </View>
          <View style={[styles.floatingHeart, { bottom: 18, right: 44 }]}>
            <AppIcon name="heart" color="#FF5C8D" size={18} />
          </View>

          <View style={styles.circlesRow}>
            <View style={[styles.circleFrame, styles.leftCircle]}>
              <Image
                key={visiblePeople?.myPhoto ?? 'mine-fallback'}
                accessibilityLabel={`Ảnh của ${visiblePeople?.mine.displayName ?? 'Bạn'}`}
                source={getProfileImageSource(
                  visiblePeople?.myPhoto,
                  visiblePeople?.mine.id ?? 'match-mine',
                  visiblePeople?.mine.gender ?? 'man',
                  visiblePeople?.mine.displayName,
                )}
                style={styles.circleImage}
                resizeMode="cover"
              />
            </View>
            <View style={[styles.circleFrame, styles.rightCircle]}>
              <Image
                key={visiblePeople?.otherPhoto ?? 'other-fallback'}
                accessibilityLabel={`Ảnh của ${otherName}`}
                source={getProfileImageSource(
                  visiblePeople?.otherPhoto,
                  visiblePeople?.other.id ?? 'match-other',
                  visiblePeople?.other.gender ?? 'woman',
                  otherName,
                )}
                style={styles.circleImage}
                resizeMode="cover"
              />
            </View>
            <View pointerEvents="none" accessible={false} style={styles.centerHeartBadge}>
              <Image
                source={brandAssets.pinkButtonGradient}
                style={StyleSheet.absoluteFill}
                resizeMode="stretch"
              />
              <AppIcon name="heart" color="#FFFFFF" size={26} />
            </View>
          </View>
        </View>
      </AnimatedSection>

      <AnimatedSection>
        <View style={styles.copySection}>
          <AppText accessibilityRole="header" style={styles.title}>
            It&apos;s a Match! 🎉
          </AppText>
          <AppText tone="muted" style={styles.subtitle}>
            Bạn và {otherName} đã thích nhau!
          </AppText>
        </View>
      </AnimatedSection>

      <View style={styles.actions}>
        <AppButton
          label="Nhắn tin ngay"
          onPress={() => navigation.replace('Chat', { matchId })}
        />
        <AppButton
          label="Tiếp tục khám phá"
          variant="secondary"
          onPress={() => navigation.navigate('MainTabs', { screen: 'Discover' })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFF5F8',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  brandHeader: {
    alignItems: 'center',
    gap: 2,
  },
  brandLogo: {
    width: 46,
    height: 36,
  },
  brandWordmark: {
    fontFamily: fonts.extrabold,
    fontSize: 18,
    color: colors.ink,
  },
  stage: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  softAuraOuter: {
    position: 'absolute',
    width: 260,
    height: 220,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 182, 206, 0.25)',
  },
  softAuraInner: {
    position: 'absolute',
    width: 200,
    height: 170,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 143, 171, 0.22)',
  },
  floatingHeart: {
    position: 'absolute',
    zIndex: 2,
  },
  circlesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleFrame: {
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
    shadowColor: '#D65B88',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  leftCircle: {
    marginRight: -16,
    zIndex: 2,
  },
  rightCircle: {
    marginLeft: -16,
    zIndex: 3,
  },
  circleImage: {
    width: '100%',
    height: '100%',
  },
  centerHeartBadge: {
    position: 'absolute',
    bottom: -10,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 5,
    shadowColor: '#E6386F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  copySection: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 34,
    lineHeight: 42,
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 24,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
});
