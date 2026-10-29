import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FeaturePlaceholder } from '../../shared/components/FeaturePlaceholder';
import type { RootStackParamList } from '../../navigation/types';

export function FiltersScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Filters'>) {
  return <FeaturePlaceholder eyebrow="UC08" title="Bộ lọc khám phá"
    description="Khoảng tuổi, khoảng cách và tiêu chí lọc được nối với backend ở Q04." onBack={navigation.goBack} />;
}
