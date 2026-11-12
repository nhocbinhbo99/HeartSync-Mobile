/* Native mocks must be hoisted before the AI component imports. */
/* eslint-disable @typescript-eslint/no-require-imports, import/first */
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));
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
    LinearTransition: { reduceMotion: () => transition },
    Easing: { cubic: 'cubic', out: (value: unknown) => value },
    ReduceMotion: { System: 'system' },
  };
  return { __esModule: true, default: animated, ...animated };
});
jest.mock('../../../services/AppServicesProvider', () => ({ useAppServices: jest.fn() }));
jest.mock('../../auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../aiConsent', () => ({ hasAiConsent: jest.fn(() => true), recordAiConsent: jest.fn() }));
jest.mock('../ProComingSoonModal', () => ({ ProComingSoonModal: () => null }));
jest.mock('../AiSheetChrome', () => {
  const native = require('react-native');
  const MockPressable = native.Pressable;
  const MockText = native.Text;
  const MockView = native.View;
  return {
    AiTriggerPill: ({ label, onPress }: { label: string; onPress: () => void }) => <MockPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}><MockText>{label}</MockText></MockPressable>,
    AiSheetShell: ({ visible, children }: { visible: boolean; children: unknown }) => visible ? <MockView>{children}</MockView> : null,
    AiConsentNotice: ({ text }: { text: string }) => <MockText>{text}</MockText>,
  };
});

import { randomUUID } from 'expo-crypto';
import { useAppServices } from '../../../services/AppServicesProvider';
import { useAuth } from '../../auth/AuthProvider';
import { AiIcebreakerAssistant } from '../AiIcebreakerAssistant';

const quota = { limit: 2 as const, used: 0, remaining: 2, resetAt: '2026-11-13T00:00:00+07:00' };
const firstRequestId = '10000000-0000-4000-8000-000000000001';
const secondRequestId = '10000000-0000-4000-8000-000000000002';

describe('AiIcebreakerAssistant', () => {
  const getQuotas = jest.fn();
  const generateIcebreaker = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(randomUUID).mockReturnValueOnce(firstRequestId).mockReturnValue(secondRequestId);
    jest.mocked(useAuth).mockReturnValue({ user: { id: 'user-1' } } as never);
    jest.mocked(useAppServices).mockReturnValue({
      ai: { getQuotas, generateIcebreaker },
    } as never);
    getQuotas.mockResolvedValue({ ok: true, data: { profileBio: quota, icebreaker: quota } });
    generateIcebreaker.mockResolvedValue({
      ok: false,
      error: { code: 'unavailable', message: 'AI tạm thời chưa khả dụng.', retryable: true },
    });
  });

  it('keeps a retry action visible and creates a new request after a refunded provider failure', async () => {
    const screen = await render(<AiIcebreakerAssistant matchId="20000000-0000-4000-8000-000000000001" enabled onSelect={jest.fn()} />);
    await act(async () => fireEvent.press(screen.getByLabelText('✨ Gợi ý mở đầu')));
    await waitFor(() => expect(screen.getByLabelText('Tạo 3 gợi ý')).toBeTruthy());

    await act(async () => fireEvent.press(screen.getByLabelText('Tạo 3 gợi ý')));
    await waitFor(() => expect(screen.getByLabelText('Thử lại')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByLabelText('Thử lại')));

    await waitFor(() => expect(generateIcebreaker).toHaveBeenCalledTimes(2));
    expect(generateIcebreaker.mock.calls[0][0]).toMatchObject({ requestId: firstRequestId });
    expect(generateIcebreaker.mock.calls[1][0]).toMatchObject({ requestId: secondRequestId });
    await screen.unmount();
  });
});
