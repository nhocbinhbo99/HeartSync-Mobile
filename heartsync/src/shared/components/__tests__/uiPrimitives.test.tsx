/* Jest's native/Reanimated mocks must be hoisted before these component imports. */
/* eslint-disable @typescript-eslint/no-require-imports, import/first */
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('expo-symbols', () => ({ SymbolView: 'SymbolView' }));
jest.mock('react-native-reanimated', () => {
  const native = require('react-native');
  const animated = {
    createAnimatedComponent: (Component: unknown) => Component,
    View: native.View,
    useAnimatedStyle: (updater: () => object) => updater(),
    useReducedMotion: () => false,
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
    Easing: { cubic: 'cubic', out: (value: unknown) => value },
    ReduceMotion: { System: 'system' },
  };
  return { __esModule: true, default: animated, ...animated };
});

import { AppButton } from '../AppButton';
import { AppText } from '../AppText';
import { Avatar } from '../Avatar';
import { IconButton } from '../IconButton';
import { SectionHeader } from '../SectionHeader';

it('keeps standard and icon-only actions named, interactive, and guarded while loading', async () => {
  const onIconPress = jest.fn();
  const onSave = jest.fn();
  const screen = await render(<>
    <IconButton icon="bookmark" label="Lưu hồ sơ An Bình" onPress={onIconPress} />
    <AppButton label="Lưu thay đổi" loading onPress={onSave} />
  </>);

  fireEvent.press(screen.getByLabelText('Lưu hồ sơ An Bình'));
  fireEvent.press(screen.getByText('Lưu thay đổi'));

  expect(onIconPress).toHaveBeenCalledTimes(1);
  expect(onSave).not.toHaveBeenCalled();
});

it('provides semantic shared typography, headings, and non-photographic avatar fallbacks', async () => {
  const screen = await render(<>
    <SectionHeader title="Thông tin cơ bản" description="Chỉ bạn có thể chỉnh sửa các dữ liệu riêng tư." />
    <Avatar label="Minh Anh" />
    <AppText variant="caption" tone="danger">Không thể lưu thay đổi.</AppText>
  </>);

  expect(screen.getByRole('header', { name: 'Thông tin cơ bản' })).toBeTruthy();
  expect(screen.getByLabelText('Minh Anh')).toBeTruthy();
  expect(screen.getByText('MA')).toBeTruthy();
  expect(screen.getByText('Không thể lưu thay đổi.')).toBeTruthy();
});
