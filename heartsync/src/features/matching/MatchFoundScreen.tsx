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
  return <Screen scroll={false} safeTop contentStyle={styles.screen}>
    <View style={styles.confirmation}>
      <View pointerEvents="none" accessible={false} style={[styles.orbit, styles.orbitOuter]} />
      <View pointerEvents="none" accessible={false} style={[styles.orbit, styles.orbitInner]} />
      <View accessible accessibilityRole="image" accessibilityLabel="Kết nối mới" style={styles.signal}><AppIcon name="heart" color={colors.primaryPressed} size={40} /></View>
      <AppText accessibilityRole="header" variant="display" tone="onPrimary" style={styles.title}>Đã kết nối!</AppText>
      <AppText tone="onPrimary" style={styles.copy}>Hai người đã cùng chọn nhau. Đừng ngại gửi một lời chào đầu tiên.</AppText>
    </View>
    <View style={styles.actions}>
      <AppButton label="Bắt đầu trò chuyện" trailingIcon="forward" onPress={() => navigation.replace('Chat', { matchId })} style={styles.primaryAction} />
      <AppButton label="Tiếp tục khám phá" variant="quiet" onPress={() => navigation.navigate('MainTabs', { screen: 'Discover' })} style={styles.quietAction} />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.primaryPressed, justifyContent: 'space-between', paddingVertical: spacing.xxl, gap: spacing.xxl },
  confirmation: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.md },
  orbit: { position: 'absolute', borderRadius: radii.pill, borderColor: 'rgba(255,255,255,0.14)' },
  orbitOuter: { width: 292, height: 292, borderWidth: 32 },
  orbitInner: { width: 196, height: 196, borderWidth: 24, borderColor: 'rgba(255,255,255,0.18)' },
  signal: { width: 104, height: 104, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center' },
  copy: { textAlign: 'center', maxWidth: 320, opacity: 0.86 },
  actions: { gap: spacing.sm },
  primaryAction: { backgroundColor: '#FF779D', borderColor: '#FF779D' },
  quietAction: { borderColor: 'rgba(255,255,255,0.32)' },
});
