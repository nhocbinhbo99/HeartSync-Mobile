import type { PropsWithChildren, ReactNode } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from '../motion/tokens';

type Props = PropsWithChildren<Pick<PressableProps, 'accessibilityHint' | 'accessibilityLabel' | 'accessibilityRole' | 'accessibilityState' | 'accessibilityValue' | 'disabled' | 'hitSlop' | 'onLayout' | 'onLongPress' | 'onPress' | 'testID'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  rippleColor?: string;
  disabledOpacity?: number;
}>;

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({ children, style, pressedScale = 0.98, rippleColor = 'rgba(0, 102, 116, 0.12)', disabledOpacity = 0.52, disabled = false, ...props }: Props) {
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressed.value ? pressedScale : 1, motion.press) }],
  }));

  return <AnimatedPressableBase {...props} disabled={disabled}
    android_ripple={Platform.OS === 'android' ? { color: rippleColor, borderless: false } : undefined}
    onPressIn={() => { if (!disabled && !reduceMotion) pressed.value = 1; }}
    onPressOut={() => { pressed.value = 0; }}
    style={[style, animatedStyle, { opacity: disabled ? disabledOpacity : 1, overflow: 'hidden' }]}>
    {children}
  </AnimatedPressableBase>;
}
