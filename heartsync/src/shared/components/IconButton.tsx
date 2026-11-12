import { StyleSheet, type ViewStyle } from 'react-native';

import { colors, componentSize, radii } from '../theme/tokens';
import { AnimatedPressable } from './AnimatedPressable';
import { AppIcon, type AppIconName } from './AppIcon';

type Props = {
  icon: AppIconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'primary' | 'danger' | 'onPrimary';
  size?: number;
  style?: ViewStyle;
};

const tones = {
  default: colors.inkMuted,
  primary: colors.primaryPressed,
  danger: colors.danger,
  onPrimary: colors.onPrimary,
} as const;

export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  tone = 'default',
  size = 22,
  style,
}: Props) {
  const color = disabled ? colors.inkMuted : tones[tone];
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      rippleColor="rgba(255, 77, 125, 0.14)"
      style={[styles.button, style]}
    >
      <AppIcon name={icon} color={color} size={size} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: componentSize.iconButton,
    height: componentSize.iconButton,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
