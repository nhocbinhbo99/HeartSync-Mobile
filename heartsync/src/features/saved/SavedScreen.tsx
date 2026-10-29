import { AsyncStatePanel } from '../../shared/components/AsyncStatePanel';
import { Screen } from '../../shared/components/Screen';

export function SavedScreen() {
  return <Screen><AsyncStatePanel state="empty" title="Chưa có hồ sơ đã thích"
    description="Các lượt thích chỉ được lưu sau khi máy chủ xác nhận ở Q04." /></Screen>;
}
