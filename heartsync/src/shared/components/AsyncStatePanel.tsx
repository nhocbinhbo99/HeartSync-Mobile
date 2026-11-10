import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatePanel } from './StatePanel';
import { SkeletonBlock } from './SkeletonBlock';
import { colors } from '../theme/tokens';
import type { AsyncViewState } from '../types/ui';

type Props = {
  state: AsyncViewState;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};
export function AsyncStatePanel({ state, title, description, actionLabel, onAction }: Props) {
  if (state === 'loading') return <View accessibilityRole="progressbar" accessibilityLabel={title}
    accessibilityValue={{ min: 0, max: 100 }} style={styles.loading}>
    <View style={styles.skeletons}><SkeletonBlock height={22} width="62%" /><SkeletonBlock height={16} width="100%" /><SkeletonBlock height={16} width="78%" /></View>
    <ActivityIndicator color={colors.primary} size="small" />
  </View>;
  return <StatePanel eyebrow={state === 'error' ? 'Có lỗi' : 'Trống'} title={title} description={description}
    icon={state === 'error' ? 'error' : 'search'} tone={state === 'error' ? 'error' : 'neutral'} actionLabel={actionLabel} onAction={onAction} />;
}

const styles = StyleSheet.create({
  loading: { minHeight: 172, borderRadius: 22, padding: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'space-between' },
  skeletons: { gap: 12 },
});
