/* Native/Reanimated mocks must be hoisted before auth UI imports. */
/* eslint-disable @typescript-eslint/no-require-imports, import/first */
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('expo-symbols', () => ({ SymbolView: 'SymbolView' }));
jest.mock('react-native-reanimated', () => {
  const native = require('react-native');
  const transition = { reduceMotion: () => ({}) };
  const animated = {
    createAnimatedComponent: (Component: unknown) => Component,
    View: native.View,
    useAnimatedStyle: (updater: () => object) => updater(),
    useReducedMotion: () => false,
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
    FadeIn: { duration: () => transition },
    LinearTransition: { duration: () => transition },
    Easing: { cubic: 'cubic', out: (value: unknown) => value },
    ReduceMotion: { System: 'system' },
  };
  return { __esModule: true, default: animated, ...animated };
});
jest.mock('../AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../../../shared/components/Snackbar', () => ({ useSnackbar: () => ({ show: jest.fn() }) }));

import { useAuth } from '../AuthProvider';
import { AuthScreen } from '../AuthScreen';

const navigation = {
  canGoBack: jest.fn(() => true),
  goBack: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useAuth).mockReturnValue({
    signIn: jest.fn(),
    signUp: jest.fn(),
    requestPasswordReset: jest.fn(),
    bootstrapError: undefined,
  } as never);
});

it('keeps the sign-in hierarchy, safety copy, and route actions accessible', async () => {
  const screen = await render(
    <AuthScreen navigation={navigation as never} route={{ key: 'sign-in', name: 'SignIn' } as never} mode="sign-in" />,
  );

  expect(screen.getByRole('header', { name: 'Chào mừng trở lại! 👋' })).toBeTruthy();
  expect(screen.getByText('Kết nối chỉ được tạo khi cả hai cùng đồng ý.')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Tạo tài khoản'));
  fireEvent.press(screen.getByLabelText('Quên mật khẩu'));
  expect(navigation.navigate).toHaveBeenCalledWith('SignUp');
  expect(navigation.navigate).toHaveBeenCalledWith('ForgotPassword');
});

