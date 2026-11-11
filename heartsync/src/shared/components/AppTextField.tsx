import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, componentSize, fonts, radii, spacing, type } from '../theme/tokens';

type Props = TextInputProps & { label: string; error?: string; rightAccessory?: ReactNode };

export function AppTextField({ label, error, style, rightAccessory, ...inputProps }: Props) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.frame, error ? styles.inputError : undefined]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={colors.inkMuted}
          style={[styles.input, style]}
          {...inputProps}
        />
        {rightAccessory}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: { ...type.label, color: colors.ink },
  frame: {
    minHeight: componentSize.fieldHeight,
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    minHeight: componentSize.fieldHeight - 2,
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  inputError: { borderColor: colors.danger },
  error: { ...type.caption, color: colors.danger },
});
