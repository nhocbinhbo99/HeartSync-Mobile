import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { colors, radii, spacing, type } from '../theme/tokens';

type Props = { eyebrow?: string; title: string; description: string; actionLabel?: string; onAction?: () => void; tone?: 'neutral' | 'error' };
export function StatePanel({ eyebrow, title, description, actionLabel, onAction, tone = 'neutral' }: Props) {
  return <View style={[styles.card, tone === 'error' ? styles.errorCard : undefined]}>
    {eyebrow ? <Text style={[styles.eyebrow, tone === 'error' ? styles.errorText : undefined]}>{eyebrow}</Text> : null}
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} variant={tone === 'error' ? 'danger' : 'secondary'} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  errorCard: { borderColor: colors.danger }, eyebrow: { ...type.label, color: colors.primaryPressed, textTransform: 'uppercase' },
  errorText: { color: colors.danger }, title: { ...type.title, color: colors.ink }, description: { ...type.body, color: colors.inkMuted },
});
