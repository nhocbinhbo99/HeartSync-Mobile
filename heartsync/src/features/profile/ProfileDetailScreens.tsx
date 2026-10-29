import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FeaturePlaceholder } from '../../shared/components/FeaturePlaceholder';
import type { RootStackParamList } from '../../navigation/types';

export function EditProfileScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'EditProfile'>) {
  return <FeaturePlaceholder eyebrow="UC03" title="Chỉnh sửa hồ sơ"
    description="Form hồ sơ thật và kiểm tra tuổi được triển khai ở Q03." onBack={navigation.goBack} />;
}
export function OtherProfileScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'OtherProfile'>) {
  return <FeaturePlaceholder eyebrow="UC10" title="Hồ sơ người dùng"
    description="Màn chi tiết chỉ hiển thị dữ liệu server cho phép ở Q04." onBack={navigation.goBack} />;
}
export function SafetyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Safety'>) {
  return <FeaturePlaceholder eyebrow="UC15–UC19" title="An toàn & quyền riêng tư"
    description="Block, report, unmatch và xóa tài khoản được triển khai theo policy ở Q07." onBack={navigation.goBack} />;
}
