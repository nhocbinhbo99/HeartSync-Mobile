import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FeaturePlaceholder } from '../../shared/components/FeaturePlaceholder';
import type { RootStackParamList } from '../../navigation/types';

export function MatchFoundScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'MatchFound'>) {
  return <FeaturePlaceholder eyebrow="UC09 · Mẫu route" title="Chưa có match được xác nhận"
    description="Route MatchFound chỉ hiển thị thành công khi máy chủ xác nhận mutual like ở Q04." onBack={navigation.goBack} />;
}
