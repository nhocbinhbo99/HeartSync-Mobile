import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../theme/tokens';
import { AppText } from './AppText';

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/** Keeps a section's purpose and its optional action together without adding another card. */
export function SectionHeader({ title, description, action }: Props) {
  return <View style={styles.row}>
    <View style={styles.copy}>
      <AppText accessibilityRole="header" variant="subtitle">{title}</AppText>
      {description ? <AppText tone="muted">{description}</AppText> : null}
    </View>
    {action ? <View style={styles.action}>{action}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  copy: { flex: 1, gap: spacing.xxs },
  action: { marginTop: -spacing.xs },
});
