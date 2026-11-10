import type { TextProps } from 'react-native';
import { Text } from 'react-native';

import { colors, type } from '../theme/tokens';

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

/** Typography roles preserve the system font and Android font scaling by default. */
export function AppText({ variant = 'body', tone = 'default', style, ...props }: Props) {
  return <Text {...props} style={[type[variant], { color: tones[tone] }, style]} />;
}
