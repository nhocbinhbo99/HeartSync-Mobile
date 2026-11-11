import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import { colors, radii, spacing } from '../../shared/theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

export function MatchFoundScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'MatchFound'>) {
  const matchId = route.params?.matchId;
  if (!matchId) return <Screen><StatePanel title="Chưa có match được xác nhận" description="Match chỉ xuất hiện sau khi máy chủ xác nhận mutual like." /><AppButton label="Quay lại" variant="quiet" onPress={() => navigation.goBack()} /></Screen>;
  return <Screen contentStyle={styles.screen}>
    <View style={styles.confirmation}>
      <View accessible={false} style={styles.signal}><AppIcon name="checkCircle" color={colors.success} size={32} /></View>
      <AppText accessibilityRole="header" variant="title" style={styles.title}>Kết nối đã được xác nhận</AppText>
      <AppText tone="muted" style={styles.copy}>Cả hai đã bày tỏ sự quan tâm. Bạn có thể bắt đầu trò chuyện khi sẵn sàng.</AppText>
    </View>
    <View style={styles.actions}>
      <AppButton label="Mở trò chuyện" onPress={() => navigation.replace('Chat', { matchId })} />
      <AppButton label="Xem kết nối" variant="secondary" onPress={() => navigation.navigate('MainTabs', { screen: 'Matches' })} />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', gap: spacing.xxl },
  confirmation: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  signal: { width: 72, height: 72, borderRadius: radii.pill, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center' },
  copy: { textAlign: 'center', maxWidth: 320 },
  actions: { gap: spacing.sm },
});
