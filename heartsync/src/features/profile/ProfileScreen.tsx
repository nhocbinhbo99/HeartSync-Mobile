import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '../../shared/components/AppButton';
import { Screen } from '../../shared/components/Screen';
import { StatePanel } from '../../shared/components/StatePanel';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Profile'>, NativeStackScreenProps<RootStackParamList>>;
export function ProfileScreen({ navigation }: Props) {
  return <Screen><StatePanel eyebrow="Hồ sơ của tôi" title="Hồ sơ chưa được đồng bộ"
    description="Q03 sẽ kết nối hồ sơ thật, ảnh và các ràng buộc 18+." />
    <AppButton label="Chỉnh sửa hồ sơ" onPress={() => navigation.navigate('EditProfile')} />
    <AppButton label="An toàn & quyền riêng tư" variant="secondary" onPress={() => navigation.navigate('Safety')} />
  </Screen>;
}
