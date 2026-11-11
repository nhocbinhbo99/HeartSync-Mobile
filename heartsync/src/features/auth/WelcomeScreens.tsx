import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, ImageBackground, StyleSheet, View } from 'react-native';

import type { RootStackParamList } from '../../navigation/types';
import { AnimatedSection } from '../../shared/components/AnimatedSection';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { Screen } from '../../shared/components/Screen';
import { colors, fonts, radii, spacing } from '../../shared/theme/tokens';
import { onboardingAvatars } from '../../shared/utils/avatarHelper';

type WelcomeProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;
type OnboardingProps = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const welcomeBackground = require('../../../assets/images/auth-bg.jpg');

export function WelcomeScreen({ navigation }: WelcomeProps) {
  return (
    <View style={styles.welcomeRoot}>
      <ImageBackground source={welcomeBackground} resizeMode="cover" style={styles.welcomeBackdrop}>
        <View style={styles.welcomeOverlay} />
        <Screen scroll={false} safeTop contentStyle={styles.welcomePage}>
          <View style={styles.welcomeTop}>
            <AnimatedSection>
              <View accessible accessibilityRole="image" accessibilityLabel="Biểu tượng HeartSync" style={styles.heartLogoCircle}>
                <View style={styles.heartLogoInner}>
                  <AppIcon name="heart" color={colors.primary} size={42} />
                </View>
              </View>
            </AnimatedSection>
            <AppText tone="onPrimary" style={styles.welcomeWordmark}>
              HeartSync
            </AppText>
            <AppText tone="onPrimary" style={styles.welcomeTagline}>
              Kết nối những trái tim{`\n`}cùng nhịp đập
            </AppText>
          </View>

          <View style={styles.welcomeActions}>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Bắt đầu khám phá"
              onPress={() => navigation.navigate('Onboarding')}
              style={styles.welcomePrimaryBtn}
            >
              <AppText style={styles.welcomePrimaryText}>Bắt đầu khám phá</AppText>
              <AppIcon name="forward" color={colors.primaryPressed} size={20} />
            </AnimatedPressable>

            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Tôi đã có tài khoản"
              onPress={() => navigation.navigate('SignIn')}
              rippleColor="rgba(255,255,255,0.22)"
              style={styles.welcomeSecondaryBtn}
            >
              <AppText variant="label" tone="onPrimary" style={styles.welcomeSecondaryText}>
                Tôi đã có tài khoản
              </AppText>
            </AnimatedPressable>

            <AppText tone="onPrimary" style={styles.welcomeSupporting}>
              Kết nối có ý nghĩa bắt đầu từ sự chân thành.
            </AppText>
          </View>
        </Screen>
      </ImageBackground>
    </View>
  );
}

const onboardingPages = [
  {
    key: 'discover',
    title: 'Gặp gỡ người phù hợp',
    body: 'Khám phá, kết nối và bắt đầu những câu chuyện đầy cảm xúc cùng những người thực sự hợp gu.',
  },
  {
    key: 'chat',
    title: 'Trò chuyện thoải mái',
    body: 'Nhắn tin tức thì, gọi thoại và gọi video an toàn để hiểu nhau hơn mỗi ngày.',
  },
  {
    key: 'safety',
    title: 'An toàn & Riêng tư',
    body: 'Mọi thông tin cá nhân luôn được bảo vệ chặt chẽ. Chỉ khi cả hai cùng đồng ý mới mở kết nối.',
  },
] as const;

export function OnboardingScreen({ navigation }: OnboardingProps) {
  const [page, setPage] = useState(0);
  const current = onboardingPages[page];
  const isLast = page === onboardingPages.length - 1;

  const continueOnboarding = () => {
    if (isLast) navigation.replace('SignIn');
    else setPage((value) => value + 1);
  };

  return (
    <Screen scroll={false} safeTop contentStyle={styles.onboardingPage}>
      <View style={styles.onboardingHeader}>
        <View style={styles.onboardingBrandRow}>
          <AppIcon name="heart" color={colors.primary} size={22} />
          <AppText style={styles.onboardingWordmark} tone="primary">
            HeartSync
          </AppText>
        </View>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Bỏ qua giới thiệu"
          onPress={() => navigation.replace('SignIn')}
          style={styles.skipButton}
        >
          <AppText variant="label" tone="muted">
            Bỏ qua
          </AppText>
        </AnimatedPressable>
      </View>

      <View style={styles.onboardingArtwork} accessible accessibilityRole="image" accessibilityLabel={current.title}>
        {current.key === 'discover' ? (
          <View style={styles.photoPair}>
            <View style={[styles.photoCard, styles.photoCardLeft]}>
              <Image source={onboardingAvatars.man} style={styles.photoImage} />
            </View>
            <View style={[styles.photoCard, styles.photoCardRight]}>
              <Image source={onboardingAvatars.woman} style={styles.photoImage} />
            </View>
            <View style={styles.centerHeartBadge}>
              <AppIcon name="heart" color={colors.onPrimary} size={24} />
            </View>
          </View>
        ) : current.key === 'chat' ? (
          <View style={styles.illustrationStage}>
            <View style={[styles.chatPill, styles.chatPillTop]}>
              <AppIcon name="heart" color={colors.onPrimary} size={28} />
            </View>
            <View style={[styles.chatPill, styles.chatPillBottom]}>
              <AppIcon name="send" color={colors.primaryPressed} size={26} />
            </View>
          </View>
        ) : (
          <View style={styles.shieldStage}>
            <View style={styles.shieldOuter}>
              <AppIcon name="shield" color={colors.primary} size={64} />
            </View>
          </View>
        )}
      </View>

      <View style={styles.onboardingCopy}>
        <AppText accessibilityRole="header" style={styles.onboardingTitle}>
          {current.title}
        </AppText>
        <AppText tone="muted" style={styles.onboardingBody}>
          {current.body}
        </AppText>
      </View>

      <View style={styles.onboardingFooter}>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Tiến trình giới thiệu"
          accessibilityValue={{ min: 1, max: onboardingPages.length, now: page + 1 }}
          style={styles.pagination}
        >
          {onboardingPages.map((item, index) => (
            <View key={item.title} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>
        <AppButton label={isLast ? 'Bắt đầu ngay' : 'Tiếp tục'} trailingIcon="forward" onPress={continueOnboarding} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcomeRoot: { flex: 1, backgroundColor: colors.primaryPressed },
  welcomeBackdrop: { flex: 1 },
  welcomeOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(176, 30, 82, 0.72)',
  },
  welcomePage: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  welcomeTop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  heartLogoCircle: {
    width: 112,
    height: 112,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heartLogoInner: {
    width: 82,
    height: 82,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  welcomeWordmark: {
    fontFamily: fonts.extrabold,
    fontSize: 42,
    lineHeight: 48,
    textAlign: 'center',
  },
  welcomeTagline: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    opacity: 0.94,
  },
  welcomeActions: {
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  welcomePrimaryBtn: {
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  welcomePrimaryText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.primaryPressed,
  },
  welcomeSecondaryBtn: {
    minHeight: 52,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeSecondaryText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.onPrimary,
  },
  welcomeSupporting: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  onboardingPage: { padding: spacing.lg, justifyContent: 'space-between', gap: spacing.lg },
  onboardingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  onboardingBrandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  onboardingWordmark: { fontFamily: fonts.extrabold, fontSize: 22, lineHeight: 28 },
  skipButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.sm },
  onboardingArtwork: { height: 310, justifyContent: 'center', alignItems: 'center' },
  photoPair: { width: 280, height: 260, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  photoCard: {
    position: 'absolute',
    width: 152,
    height: 204,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: colors.surface,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  photoCardLeft: { left: 10, top: 14, transform: [{ rotate: '-8deg' }] },
  photoCardRight: { right: 10, bottom: 14, transform: [{ rotate: '8deg' }] },
  photoImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  centerHeartBadge: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  illustrationStage: { width: 240, height: 220, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  chatPill: {
    width: 136,
    height: 82,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  chatPillTop: {
    backgroundColor: colors.primary,
    position: 'absolute',
    top: 24,
    left: 20,
    transform: [{ rotate: '-6deg' }],
  },
  chatPillBottom: {
    backgroundColor: colors.primarySoft,
    position: 'absolute',
    bottom: 24,
    right: 20,
    transform: [{ rotate: '5deg' }],
  },
  shieldStage: { alignItems: 'center', justifyContent: 'center' },
  shieldOuter: {
    width: 148,
    height: 148,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingCopy: { gap: spacing.sm, alignItems: 'center', paddingHorizontal: spacing.sm },
  onboardingTitle: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 35, color: colors.ink, textAlign: 'center' },
  onboardingBody: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  onboardingFooter: { gap: spacing.lg },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, backgroundColor: colors.border, borderRadius: radii.pill },
  dotActive: { width: 28, backgroundColor: colors.primary },
});
