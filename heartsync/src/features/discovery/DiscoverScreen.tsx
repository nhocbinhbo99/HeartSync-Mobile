import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../shared/components/AppButton';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { colors, spacing, type } from '../../shared/theme/tokens';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Discover'>, NativeStackScreenProps<RootStackParamList>>;
export function DiscoverScreen({ navigation }: Props) {
  return <Screen>
    <View><Text style={styles.kicker}>KHÁM PHÁ</Text><Text accessibilityRole="header" style={styles.title}>Tìm người phù hợp với bạn</Text></View>
    <StatePanel eyebrow="Chưa có dữ liệu" title="Bộ gợi ý sẽ xuất hiện ở Q04"
      description="Ứng dụng không tạo hồ sơ giả. Sau khi backend và bộ lọc sẵn sàng, khu vực này hiển thị hồ sơ đủ điều kiện." />
    <AppButton label="Mở bộ lọc" onPress={() => navigation.navigate('Filters')} />
    <AppButton label="Xem khung hồ sơ người khác" variant="secondary" onPress={() => navigation.navigate('OtherProfile')} />
    <AppButton label="Xem mẫu route MatchFound (chưa xác nhận)" variant="quiet" onPress={() => navigation.navigate('MatchFound')} />
  </Screen>;
}
const styles = StyleSheet.create({ kicker: { ...type.label, color: colors.primaryPressed }, title: { ...type.display, color: colors.ink, marginTop: spacing.xs } });
