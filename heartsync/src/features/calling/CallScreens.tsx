import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FeaturePlaceholder } from '../../shared/components/FeaturePlaceholder';
import type { RootStackParamList } from '../../navigation/types';

export function AudioCallScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'AudioCall'>) {
  return <FeaturePlaceholder eyebrow="UC13" title="Cuộc gọi thoại"
    description="Phiên LiveKit và quyền microphone được triển khai ở Q06." onBack={navigation.goBack} />;
}

export function VideoCallScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'VideoCall'>) {
  return <FeaturePlaceholder eyebrow="UC14" title="Cuộc gọi video"
    description="Phiên LiveKit và quyền camera được triển khai ở Q06." onBack={navigation.goBack} />;
}
