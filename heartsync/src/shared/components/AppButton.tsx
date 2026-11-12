import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme/tokens';
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
  secondary: { background: '#FFFFFF', border: '#E4C5D3', text: colors.ink },
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
        isPrimary ? { borderWidth: 0 } : undefined,
        isPrimary && !disabled && !loading ? styles.primaryShadow : undefined,
        disabled || loading ? styles.disabled : undefined,
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {loading ? (
          <ActivityIndicator color={isPrimary ? colors.onPrimary : palette.text} />
        ) : leadingIcon ? (
          <AppIcon name={leadingIcon} color={palette.text} size={19} />
        ) : (
          icon
        )}
        <Text
          numberOfLines={1}
          style={[styles.label, { color: disabled || loading ? colors.inkMuted : palette.text }]}
        >
          {label}
        </Text>
        {trailingIcon && !loading ? (
          <AppIcon name={trailingIcon} color={palette.text} size={19} />
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radii.pill,
    borderWidth: 1.2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  primaryShadow: {
    shadowColor: '#E6386F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26,
    shadowRadius: 12,
    elevation: 4,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    lineHeight: 21,
    flexShrink: 1,
  },
  disabled: {
    backgroundColor: colors.disabled,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
});
