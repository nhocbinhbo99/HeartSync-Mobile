import { useEffect } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { colors, radii } from '../theme/tokens';

type Props = { width?: ViewStyle['width']; height: number; radius?: number; style?: ViewStyle; accessibilityLabel?: string };

export function SkeletonBlock({ width = '100%', height, radius = radii.sm, style, accessibilityLabel = 'Đang tải nội dung' }: Props) {
  const opacity = useSharedValue(0.52);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) { opacity.value = 0.6; return; }
    opacity.value = withRepeat(withTiming(0.92, { duration: 720 }), -1, true);
  }, [opacity, reduceMotion]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View accessibilityLabel={accessibilityLabel} style={[styles.base, { width, height, borderRadius: radius }, animatedStyle, style]} />;
}

const styles = StyleSheet.create({ base: { backgroundColor: colors.surfaceMuted } });
