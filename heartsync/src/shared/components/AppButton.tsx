import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, radii, spacing, type } from '../theme/tokens';
import { AnimatedPressable } from './AnimatedPressable';
import { AppIcon, type AppIconName } from './AppIcon';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: ReactNode;
  leadingIcon?: AppIconName;
  trailingIcon?: AppIconName;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
};

const variants = {
  primary: { background: colors.primary, border: colors.primary, text: colors.onPrimary },
  secondary: { background: colors.surface, border: colors.primary, text: colors.primaryPressed },
  quiet: { background: 'transparent', border: 'transparent', text: colors.primaryPressed },
  danger: { background: colors.surface, border: colors.danger, text: colors.danger },
} as const;

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
  leadingIcon,
  trailingIcon,
  loading = false,
  style,
  accessibilityHint,
}: AppButtonProps) {
  const palette = variants[variant];
  const isPrimary = variant === 'primary';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      rippleColor={isPrimary ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 77, 125, 0.12)'}
      style={[
        styles.base,
        { backgroundColor: palette.background, borderColor: palette.border },
        isPrimary && !disabled && !loading ? styles.primaryShadow : undefined,
        disabled || loading ? styles.disabled : undefined,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onPrimary : palette.text} />
      ) : leadingIcon ? (
        <AppIcon name={leadingIcon} color={palette.text} size={20} />
      ) : (
        icon
      )}
      <Text style={[styles.label, { color: disabled || loading ? colors.inkMuted : palette.text }]}>
        {label}
      </Text>
      {trailingIcon && !loading ? (
        <AppIcon name={trailingIcon} color={palette.text} size={20} />
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  primaryShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    ...type.label,
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    backgroundColor: colors.disabled,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
});
