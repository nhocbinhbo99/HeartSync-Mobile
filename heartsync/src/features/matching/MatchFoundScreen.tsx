import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '../../shared/components/AppButton';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { RootStackParamList } from '../../navigation/types';

export function MatchFoundScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'MatchFound'>) {
  const matchId = route.params?.matchId;
  if (!matchId) return <Screen><StatePanel title="Chưa có match được xác nhận" description="Match chỉ xuất hiện sau khi máy chủ xác nhận mutual like." /><AppButton label="Quay lại" variant="quiet" onPress={() => navigation.goBack()} /></Screen>;
  return <Screen><StatePanel title="Bạn đã kết nối" description="Cả hai đã bày tỏ sự quan tâm. Bạn có thể bắt đầu trò chuyện ngay." />
    <AppButton label="Mở trò chuyện" onPress={() => navigation.replace('Chat', { matchId })} />
    <AppButton label="Xem kết nối" variant="secondary" onPress={() => navigation.navigate('MainTabs', { screen: 'Matches' })} />
  </Screen>;
}
