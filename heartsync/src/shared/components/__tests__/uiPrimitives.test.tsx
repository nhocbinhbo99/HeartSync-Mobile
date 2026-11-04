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
import { IconButton } from '../IconButton';

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
