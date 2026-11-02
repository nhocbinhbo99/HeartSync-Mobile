import { AppButton } from './AppButton';
import { Screen } from './Screen';
import { StatePanel } from './StatePanel';

type Props = { eyebrow: string; title: string; description: string; onBack: () => void };
export function FeaturePlaceholder({ eyebrow, title, description, onBack }: Props) {
  return <Screen><StatePanel eyebrow={eyebrow} title={title} description={description} />
    <AppButton label="Quay lại" variant="secondary" onPress={onBack} /></Screen>;
}
