import { StyleSheet, Text } from 'react-native';
import { colors, type } from '../theme/tokens';

export function InlineFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({ error: { ...type.caption, color: colors.danger } });
