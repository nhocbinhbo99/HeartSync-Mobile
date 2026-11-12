import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../theme/tokens';

export function BottomActionBar({ children }: PropsWithChildren) {
  return <View style={styles.bar}>{children}</View>;
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'android' ? spacing.lg : spacing.md,
    gap: spacing.xs,
  },
});
