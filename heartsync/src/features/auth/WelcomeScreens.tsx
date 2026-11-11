import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import type { RootStackParamList } from '../../navigation/types';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { Screen } from '../../shared/components/Screen';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';

type WelcomeProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;
type OnboardingProps = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

function HeartMark({ inverse = false }: { inverse?: boolean }) {
  const color = inverse ? colors.onPrimary : colors.primaryPressed;
  return <View accessible accessibilityRole="image" accessibilityLabel="HeartSync" style={[styles.heartMark, inverse && styles.heartMarkInverse]}>
    <AppIcon name="heart" color={color} size={44} />
  </View>;
}

/** An information-only landing surface; it requests no device permission or profile data. */
export function WelcomeScreen({ navigation }: WelcomeProps) {
  return <Screen scroll={false} safeTop contentStyle={styles.welcomePage}>
    <View style={styles.welcomeHero}>
      <View pointerEvents="none" accessible={false} style={[styles.orbit, styles.orbitOuter]} />
      <View pointerEvents="none" accessible={false} style={[styles.orbit, styles.orbitInner]} />
      <HeartMark inverse />
    </View>
    <View style={styles.welcomeCopy}>
      <View style={styles.wordmark}><AppIcon name="heart" color={colors.onPrimary} size={24} /><AppText variant="heading" tone="onPrimary">HeartSync</AppText></View>
      <AppText variant="display" tone="onPrimary">Gặp gỡ người thật.{`\n`}Theo cách của bạn.</AppText>
      <AppText tone="onPrimary" style={styles.welcomeSupporting}>Kết nối có ý nghĩa bắt đầu từ sự chân thành.</AppText>
    </View>
    <View style={styles.welcomeActions}>
      <AppButton label="Bắt đầu khám phá" trailingIcon="forward" onPress={() => navigation.navigate('Onboarding')}
        style={styles.welcomePrimary} />
      <AppButton label="Tôi đã có tài khoản" variant="quiet" onPress={() => navigation.navigate('SignIn')}
        style={styles.welcomeSecondary} />
    </View>
  </Screen>;
}

const onboardingPages = [
  {
    title: 'Không chỉ là một cú vuốt.',
    body: 'Tìm người chia sẻ những điều nhỏ bé, từ một ly cà phê đến một câu chuyện dài.',
  },
  {
    title: 'Bắt đầu bằng điều thật.',
    body: 'Hồ sơ rõ ràng và những sở thích chung giúp cuộc trò chuyện tự nhiên hơn.',
  },
  {
    title: 'Kết nối theo nhịp của bạn.',
    body: 'Chỉ khi cả hai cùng đồng ý, HeartSync mới mở ra một kết nối.',
  },
] as const;

/** A short, skippable explanation of the product before a person signs in. */
export function OnboardingScreen({ navigation }: OnboardingProps) {
  const [page, setPage] = useState(0);
  const current = onboardingPages[page];
  const isLast = page === onboardingPages.length - 1;
  const continueOnboarding = () => {
    if (isLast) navigation.replace('SignIn');
    else setPage((value) => value + 1);
  };

  return <Screen scroll={false} safeTop contentStyle={styles.onboardingPage}>
    <View style={styles.onboardingHeader}>
      <View style={styles.onboardingBrand}><AppIcon name="heart" color={colors.primaryPressed} size={22} /><AppText variant="title" tone="primary">HeartSync</AppText></View>
      <AnimatedPressable accessibilityRole="button" accessibilityLabel="Bỏ qua giới thiệu" onPress={() => navigation.replace('SignIn')} style={styles.skipButton}>
        <AppText variant="label" tone="muted">Bỏ qua</AppText>
      </AnimatedPressable>
    </View>
    <View style={styles.onboardingArtwork} accessible accessibilityRole="image" accessibilityLabel="Minh họa kết nối chân thành">
      <View pointerEvents="none" accessible={false} style={[styles.artPanel, styles.artPanelBack]} />
      <View pointerEvents="none" accessible={false} style={[styles.artPanel, styles.artPanelFront]}>
        <HeartMark />
      </View>
      <View pointerEvents="none" accessible={false} style={styles.artLine} />
    </View>
    <View style={styles.onboardingCopy}>
      <AppText accessibilityRole="header" variant="display">{current.title}</AppText>
      <AppText tone="muted">{current.body}</AppText>
    </View>
    <View style={styles.onboardingFooter}>
      <View accessibilityRole="progressbar" accessibilityLabel="Tiến trình giới thiệu" accessibilityValue={{ min: 1, max: onboardingPages.length, now: page + 1 }} style={styles.pagination}>
        {onboardingPages.map((item, index) => <View key={item.title} style={[styles.dot, index === page && styles.dotActive]} />)}
      </View>
      <AppButton label={isLast ? 'Bắt đầu' : 'Tiếp tục'} trailingIcon="forward" onPress={continueOnboarding} />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  welcomePage: { backgroundColor: colors.primaryPressed, padding: spacing.lg, gap: spacing.lg },
  welcomeHero: { minHeight: 286, alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', borderWidth: 36, borderColor: 'rgba(255, 255, 255, 0.13)', borderRadius: radii.pill },
  orbitOuter: { width: 320, height: 320 },
  orbitInner: { width: 232, height: 232, borderWidth: 28, borderColor: 'rgba(255, 255, 255, 0.16)' },
  heartMark: { width: 104, height: 104, borderRadius: radii.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  heartMarkInverse: { backgroundColor: colors.surface },
  welcomeCopy: { flex: 1, justifyContent: 'center', gap: spacing.md },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  welcomeSupporting: { opacity: 0.82 },
  welcomeActions: { gap: spacing.sm },
  welcomePrimary: { backgroundColor: '#FF779D', borderColor: '#FF779D' },
  welcomeSecondary: { borderColor: 'rgba(255,255,255,0.42)' },
  onboardingPage: { padding: spacing.lg, gap: spacing.xl },
  onboardingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  onboardingBrand: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  skipButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.xs },
  onboardingArtwork: { minHeight: 300, justifyContent: 'center', alignItems: 'center' },
  artPanel: { position: 'absolute', width: 216, height: 238, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  artPanelBack: { backgroundColor: colors.primarySoft, transform: [{ rotate: '-7deg' }, { translateX: -42 }] },
  artPanelFront: { backgroundColor: colors.surface, transform: [{ rotate: '6deg' }, { translateX: 42 }], alignItems: 'center', justifyContent: 'center' },
  artLine: { position: 'absolute', height: 8, width: 180, borderRadius: radii.pill, backgroundColor: colors.primary, bottom: 26 },
  onboardingCopy: { flex: 1, justifyContent: 'center', gap: spacing.md },
  onboardingFooter: { gap: spacing.lg },
  pagination: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, backgroundColor: colors.border, borderRadius: radii.pill },
  dotActive: { width: 32, backgroundColor: colors.primary },
  // Keeps text roles explicit within the decorative artwork without breaking dynamic type.
  artworkCaption: { ...type.caption, color: colors.inkMuted },
});
