import type { TextProps, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { colors, fonts, type } from '../theme/tokens';

type TextVariant = keyof typeof type;
type TextTone = 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger' | 'onPrimary';

type Props = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
};

const tones = {
  default: colors.ink,
  muted: colors.inkMuted,
  primary: colors.primaryPressed,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  onPrimary: colors.onPrimary,
} as const;

function resolveFontFamily(weight: TextStyle['fontWeight'], fallback: string): string {
  if (!weight) return fallback;
  const w = String(weight);
  if (w === '800' || w === '900') return fonts.extrabold;
  if (w === '700' || w === 'bold') return fonts.bold;
  if (w === '600' || w === '500' || w === 'semibold') return fonts.semibold;
  if (w === '400' || w === 'normal' || w === '300') return fonts.regular;
  return fallback;
}

export function AppText({ variant = 'body', tone = 'default', style, ...props }: Props) {
  const baseStyle = type[variant];
  const flattened: TextStyle = StyleSheet.flatten([baseStyle, { color: tones[tone] }, style]) ?? {};
  const { fontWeight, ...restStyle } = flattened;
  const resolvedFont = resolveFontFamily(fontWeight, restStyle.fontFamily ?? baseStyle.fontFamily);

  return <Text {...props} style={[restStyle, { fontFamily: resolvedFont }]} />;
}
