import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FeaturePlaceholder } from '../../shared/components/FeaturePlaceholder';
import type { RootStackParamList } from '../../navigation/types';

export function ChatScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Chat'>) {
  return <FeaturePlaceholder eyebrow="UC11–UC12" title="Cuộc trò chuyện"
    description="Chat realtime chỉ mở cho một match đang hoạt động; triển khai ở Q05." onBack={navigation.goBack} />;
}
