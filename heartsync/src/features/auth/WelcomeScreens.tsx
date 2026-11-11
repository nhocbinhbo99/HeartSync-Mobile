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
import { brandAssets } from '../../shared/utils/avatarHelper';

type WelcomeProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;
type OnboardingProps = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export function WelcomeScreen({ navigation }: WelcomeProps) {
  return (
    <View style={styles.welcomeRoot}>
      <ImageBackground
        source={brandAssets.splashSunsetBg}
        resizeMode="cover"
        style={styles.welcomeBackdrop}
      >
        <Screen scroll={false} safeTop contentStyle={styles.welcomePage}>
          <View style={styles.welcomeHero}>
            <AnimatedSection>
              <View
                accessible
                accessibilityRole="image"
                accessibilityLabel="Biểu tượng HeartSync"
                style={styles.logoGlowWrap}
              >
                <Image
                  source={brandAssets.logoWhite}
                  style={styles.welcomeLogoImage}
                  resizeMode="contain"
                />
              </View>
            </AnimatedSection>
            <AppText tone="onPrimary" style={styles.welcomeWordmark}>
              HeartSync
            </AppText>
            <AppText tone="onPrimary" style={styles.welcomeTagline}>
              Kết nối những trái tim{'\n'}cùng nhịp đập
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
    body: 'Khám phá, kết nối và bắt đầu\nnhững câu chuyện mới.',
    illustration: brandAssets.onboardingCouple,
  },
  {
    key: 'chat',
    title: 'Trò chuyện thoải mái',
    body: 'Nhắn tin, gọi thoại, gọi video và\nhiểu nhau hơn mỗi ngày.',
    illustration: brandAssets.onboardingChat,
  },
  {
    key: 'safety',
    title: 'An toàn & Riêng tư',
    body: 'Thông tin của bạn luôn được\nbảo vệ và kiểm soát.',
    illustration: brandAssets.onboardingShield,
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
      <View style={styles.onboardingTopBar}>
        {page > 0 ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => setPage((value) => Math.max(0, value - 1))}
            style={styles.skipButton}
          >
            <AppIcon name="back" color={colors.ink} size={22} />
          </AnimatedPressable>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
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

      <View
        style={styles.onboardingArtwork}
        accessible
        accessibilityRole="image"
        accessibilityLabel={current.title}
      >
        <Image
          source={current.illustration}
          style={styles.onboardingIllustration}
          resizeMode="contain"
        />
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
        {isLast ? (
          <View style={styles.lastSlideFooter}>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Tiến trình giới thiệu"
              accessibilityValue={{ min: 1, max: onboardingPages.length, now: page + 1 }}
              style={styles.paginationCentered}
            >
              {onboardingPages.map((item, index) => (
                <View key={item.title} style={[styles.dot, index === page && styles.dotActive]} />
              ))}
            </View>
            <AppButton label="Bắt đầu ngay" onPress={continueOnboarding} />
          </View>
        ) : (
          <View style={styles.rowFooter}>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Tiến trình giới thiệu"
              accessibilityValue={{ min: 1, max: onboardingPages.length, now: page + 1 }}
              style={styles.paginationLeft}
            >
              {onboardingPages.map((item, index) => (
                <View key={item.title} style={[styles.dot, index === page && styles.dotActive]} />
              ))}
            </View>

            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Tiếp tục"
              onPress={continueOnboarding}
              style={styles.nextCircleBtn}
            >
              <Image
                source={brandAssets.pinkButtonGradient}
                style={StyleSheet.absoluteFill}
                resizeMode="stretch"
              />
              <AppIcon name="forward" color={colors.onPrimary} size={24} />
            </AnimatedPressable>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcomeRoot: { flex: 1, backgroundColor: '#983E73' },
  welcomeBackdrop: { flex: 1 },
  welcomePage: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  welcomeHero: {
    alignItems: 'center',
    marginTop: 56,
    gap: spacing.xs,
  },
  logoGlowWrap: {
    width: 108,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  welcomeLogoImage: {
    width: 96,
    height: 76,
  },
  welcomeWordmark: {
    fontFamily: fonts.extrabold,
    fontSize: 40,
    lineHeight: 48,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  welcomeTagline: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.94)',
    marginTop: 4,
  },
  welcomeActions: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  welcomePrimaryBtn: {
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: '#4A1230',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
  welcomePrimaryText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.primaryPressed,
  },
  welcomeSecondaryBtn: {
    minHeight: 50,
    borderRadius: radii.pill,
    borderWidth: 1.4,
    borderColor: 'rgba(255, 255, 255, 0.78)',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeSecondaryText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  onboardingPage: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
    backgroundColor: '#FFF7F9',
  },
  onboardingTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  skipPlaceholder: { width: 40 },
  skipButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  onboardingArtwork: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardingIllustration: {
    width: 280,
    height: 280,
  },
  onboardingCopy: {
    gap: spacing.sm,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  onboardingTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 26,
    lineHeight: 34,
    color: colors.ink,
    textAlign: 'center',
  },
  onboardingBody: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: colors.inkMuted,
  },
  onboardingFooter: {
    paddingTop: spacing.md,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  lastSlideFooter: {
    gap: spacing.lg,
  },
  paginationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paginationCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 9,
    height: 9,
    backgroundColor: '#F6CEDC',
    borderRadius: radii.pill,
  },
  dotActive: {
    width: 10,
    height: 10,
    backgroundColor: colors.primary,
  },
  nextCircleBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#E6386F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
});
