import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, componentSize, fonts, radii, spacing, type } from '../theme/tokens';

type Props = TextInputProps & {
  label: string;
  error?: string;
  leftAccessory?: ReactNode;
  rightAccessory?: ReactNode;
};

export function AppTextField({
  label,
  error,
  style,
  leftAccessory,
  rightAccessory,
  ...inputProps
}: Props) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.frame, error ? styles.inputError : undefined]}>
        {leftAccessory ? <View style={styles.leftAccessory}>{leftAccessory}</View> : null}
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
  group: { gap: 6 },
  label: { ...type.label, color: colors.ink, fontSize: 14 },
  frame: {
    minHeight: componentSize.fieldHeight,
    borderWidth: 1,
    borderColor: '#F3D6E2',
    borderRadius: radii.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#D67094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  leftAccessory: {
    marginRight: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
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
