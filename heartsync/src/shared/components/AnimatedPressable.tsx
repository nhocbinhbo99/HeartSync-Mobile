import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from '../motion/tokens';

type Props = PropsWithChildren<
  Pick<
    PressableProps,
    | 'accessibilityHint'
    | 'accessibilityLabel'
    | 'accessibilityRole'
    | 'accessibilityState'
    | 'accessibilityValue'
    | 'disabled'
    | 'hitSlop'
    | 'onLayout'
    | 'onLongPress'
    | 'onPress'
    | 'testID'
  > & {
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
    pressedScale?: number;
    rippleColor?: string;
  }
>;

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children,
  style,
  pressedScale = 0.96,
  rippleColor = 'rgba(255, 77, 125, 0.12)',
  disabled = false,
  ...props
}: Props) {
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const flatStyle = StyleSheet.flatten(style) ?? {};
  const isBackdrop = flatStyle.flex === 1 && flatStyle.borderRadius === undefined;
  const resolvedRadius =
    typeof flatStyle.borderRadius === 'number' ? flatStyle.borderRadius : isBackdrop ? 0 : 14;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressed.value ? pressedScale : 1, motion.press) }],
    opacity: withTiming(disabled ? 0.52 : pressed.value ? 0.86 : 1, motion.press),
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(pressed.value && !isBackdrop ? 1 : 0, motion.press),
  }));

  return (
    <AnimatedPressableBase
      {...props}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled && !reduceMotion) pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      style={[
        style,
        animatedStyle,
        !isBackdrop && flatStyle.borderRadius === undefined ? { borderRadius: resolvedRadius } : null,
        { overflow: 'hidden' },
      ]}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: resolvedRadius,
            borderTopLeftRadius: flatStyle.borderTopLeftRadius ?? resolvedRadius,
            borderTopRightRadius: flatStyle.borderTopRightRadius ?? resolvedRadius,
            borderBottomLeftRadius: flatStyle.borderBottomLeftRadius ?? resolvedRadius,
            borderBottomRightRadius: flatStyle.borderBottomRightRadius ?? resolvedRadius,
            backgroundColor: rippleColor,
          },
          overlayAnimatedStyle,
        ]}
      />
    </AnimatedPressableBase>
  );
}
