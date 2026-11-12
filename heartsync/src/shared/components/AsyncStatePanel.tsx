import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { StatePanel } from './StatePanel';
import { SkeletonBlock } from './SkeletonBlock';
import { colors, fonts, radii, spacing } from '../theme/tokens';
import type { AsyncViewState } from '../types/ui';

type Props = {
  state: AsyncViewState;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

function PulseDots() {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);
  }, [progress, reduceMotion]);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: 0.4 + progress.value * 0.6,
    transform: [{ scale: 0.85 + progress.value * 0.25 }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: 1 - Math.abs(progress.value - 0.5) * 1.1,
    transform: [{ scale: 1.1 - Math.abs(progress.value - 0.5) * 0.4 }],
  }));
  const dot3Style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * 0.6,
    transform: [{ scale: 1.1 - progress.value * 0.25 }],
  }));

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.pulseDot, dot1Style]} />
      <Animated.View style={[styles.pulseDot, styles.pulseDotMid, dot2Style]} />
      <Animated.View style={[styles.pulseDot, dot3Style]} />
    </View>
  );
}

export function AsyncStatePanel({ state, title, description, actionLabel, onAction }: Props) {
  if (state === 'loading') {
    return (
      <View accessibilityLabel={title} style={styles.loadingContainer}>
        <View style={styles.headerRow}>
          <SkeletonBlock width={64} height={64} radius={32} />
          <View style={styles.headerLines}>
            <SkeletonBlock width="68%" height={20} radius={10} />
            <SkeletonBlock width="46%" height={14} radius={7} />
          </View>
        </View>

        <SkeletonBlock width="100%" height={210} radius={26} />

        <View style={styles.chipsRow}>
          <SkeletonBlock width={92} height={34} radius={radii.pill} />
          <SkeletonBlock width={108} height={34} radius={radii.pill} />
          <SkeletonBlock width={84} height={34} radius={radii.pill} />
        </View>

        <View style={styles.listSection}>
          <View style={styles.listRow}>
            <SkeletonBlock width={40} height={40} radius={14} />
            <View style={styles.listLines}>
              <SkeletonBlock width="58%" height={16} radius={8} />
              <SkeletonBlock width="38%" height={12} radius={6} />
            </View>
          </View>
          <View style={styles.listRow}>
            <SkeletonBlock width={40} height={40} radius={14} />
            <View style={styles.listLines}>
              <SkeletonBlock width="64%" height={16} radius={8} />
              <SkeletonBlock width="44%" height={12} radius={6} />
            </View>
          </View>
        </View>

        <View style={styles.statusRow}>
          <PulseDots />
          <Text style={styles.statusText}>{title}</Text>
        </View>
      </View>
    );
  }

  return (
    <StatePanel
      eyebrow={state === 'error' ? 'Có lỗi' : undefined}
      title={title}
      description={description}
      icon={state === 'error' ? 'error' : 'search'}
      tone={state === 'error' ? 'error' : 'neutral'}
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: spacing.sm,
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerLines: {
    flex: 1,
    gap: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listSection: {
    gap: 14,
    paddingTop: 4,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listLines: {
    flex: 1,
    gap: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  pulseDotMid: {
    backgroundColor: colors.primaryPressed,
  },
  statusText: {
    fontFamily: fonts.semibold,
    fontSize: 13.5,
    color: colors.inkMuted,
  },
});
