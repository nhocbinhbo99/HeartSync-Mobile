import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { AppIcon, type AppIconName } from './AppIcon';
import { colors, radii, spacing, type } from '../theme/tokens';

type Props = { eyebrow?: string; title: string; description: string; actionLabel?: string; onAction?: () => void; tone?: 'neutral' | 'error'; icon?: AppIconName };
export function StatePanel({ eyebrow, title, description, actionLabel, onAction, tone = 'neutral', icon }: Props) {
  return <View accessibilityRole="summary" style={[styles.card, tone === 'error' ? styles.errorCard : undefined]}>
    {icon ? <AppIcon name={icon} color={tone === 'error' ? colors.danger : colors.primaryPressed} size={24} /> : null}
    {eyebrow ? <Text style={[styles.eyebrow, tone === 'error' ? styles.errorText : undefined]}>{eyebrow}</Text> : null}
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} variant={tone === 'error' ? 'danger' : 'secondary'} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  errorCard: { borderColor: colors.danger }, eyebrow: { ...type.label, color: colors.primaryPressed },
  errorText: { color: colors.danger }, title: { ...type.title, color: colors.ink }, description: { ...type.body, color: colors.inkMuted },
});
