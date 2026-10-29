import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme/tokens';
import { clamp } from '../utils/numbers';

export function SyncLine({ label, progress = 0 }: { label: string; progress?: number }) {
  const bounded = clamp(progress, 0, 1);
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: bounded * 100 }}>
    <View style={styles.track}><View style={[styles.fill, { width: `${bounded * 100}%` }]} /></View>
    <Text style={styles.label}>{label}</Text>
  </View>;
}
const styles = StyleSheet.create({
  track: { height: 4, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary }, label: { ...type.caption, color: colors.inkMuted, marginTop: spacing.xs },
});
