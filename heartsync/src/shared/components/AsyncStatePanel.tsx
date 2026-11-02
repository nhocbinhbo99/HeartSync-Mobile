import { ActivityIndicator } from 'react-native';
import { StatePanel } from './StatePanel';
import { colors } from '../theme/tokens';
import type { AsyncViewState } from '../types/ui';

type Props = {
  state: AsyncViewState;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};
export function AsyncStatePanel({ state, title, description, actionLabel, onAction }: Props) {
  if (state === 'loading') return <><ActivityIndicator accessibilityLabel={title} color={colors.primary} size="large" />
    <StatePanel eyebrow="Đang tải" title={title} description={description} /></>;
  return <StatePanel eyebrow={state === 'error' ? 'Có lỗi' : 'Trống'} title={title} description={description}
    tone={state === 'error' ? 'error' : 'neutral'} actionLabel={actionLabel} onAction={onAction} />;
}
