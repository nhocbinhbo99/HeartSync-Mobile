import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radii } from '../theme/tokens';

type Props = {
  width?: ViewStyle['width'];
  height: number;
  radius?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export function SkeletonBlock({
  width = '100%',
  height,
  radius = radii.md,
  style,
  accessibilityLabel = 'Đang tải nội dung',
}: Props) {
  const pulse = useSharedValue(0.38);
  const shimmerX = useSharedValue(-160);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 0.65;
      return;
    }
    pulse.value = withRepeat(withTiming(0.88, { duration: 850 }), -1, true);
    shimmerX.value = withRepeat(withTiming(320, { duration: 1350 }), -1, false);
  }, [pulse, reduceMotion, shimmerX]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <Animated.View
      accessibilityLabel={accessibilityLabel}
      style={[styles.base, { width, height, borderRadius: radius }, animatedStyle, style]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.shimmerHighlight, highlightStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#EDE5EA',
    overflow: 'hidden',
  },
  shimmerHighlight: {
    width: 110,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.52)',
    borderRadius: 99,
  },
});
