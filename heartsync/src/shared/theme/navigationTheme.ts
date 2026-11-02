import { DefaultTheme, type Theme } from '@react-navigation/native';
import { colors } from './tokens';

export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background,
    card: colors.surface, text: colors.ink, border: colors.border, notification: colors.danger },
};
