import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '../../shared/components/AppButton';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Matches'>, NativeStackScreenProps<RootStackParamList>>;
export function MatchesScreen({ navigation }: Props) {
  return <Screen><StatePanel eyebrow="Kết nối" title="Chưa có match"
    description="Chỉ mutual like do máy chủ xác nhận mới tạo một kết nối và mở chat." />
    <AppButton label="Xem khung chat" onPress={() => navigation.navigate('Chat')} />
  </Screen>;
}
