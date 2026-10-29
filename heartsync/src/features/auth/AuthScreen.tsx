import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../shared/components/AppButton';
import { AppTextField } from '../../shared/components/AppTextField';
import { Screen } from '../../shared/components/Screen';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from './AuthProvider';
import { validateAuthFields, type AuthFieldErrors } from './validation';

type AuthRoute = 'SignIn' | 'SignUp' | 'ForgotPassword';
type Props = NativeStackScreenProps<RootStackParamList, AuthRoute> & { mode: 'sign-in' | 'sign-up' | 'forgot-password' };

const copy = {
  'sign-in': { eyebrow: 'HeartSync', title: 'Chào mừng bạn trở lại', body: 'Đăng nhập để tiếp tục những kết nối đã được xác nhận.', submit: 'Đăng nhập' },
  'sign-up': { eyebrow: 'Tạo tài khoản', title: 'Bắt đầu có chủ đích', body: 'Chỉ dành cho người dùng từ 18 tuổi. Bạn có thể cần xác nhận email trước khi đăng nhập.', submit: 'Tạo tài khoản' },
  'forgot-password': { eyebrow: 'Khôi phục', title: 'Lấy lại quyền truy cập', body: 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.', submit: 'Gửi liên kết' },
} as const;

export function AuthScreen({ navigation, mode }: Props) {
  const { signIn, signUp, requestPasswordReset, bootstrapError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [actionError, setActionError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const details = copy[mode];
  const needsPassword = mode !== 'forgot-password';

  const submit = async () => {
    const nextErrors = validateAuthFields(email, needsPassword ? password : undefined, mode !== 'sign-up' || ageConfirmed);
    setErrors(nextErrors); setActionError(undefined); setNotice(undefined);
    if (Object.keys(nextErrors).length > 0) return;
    setBusy(true);
    const result = mode === 'sign-in'
      ? await signIn(email, password)
      : mode === 'sign-up'
        ? await signUp(email, password)
        : await requestPasswordReset(email);
    setBusy(false);
    if (result.ok) setNotice(result.notice);
    else setActionError(result.message);
  };

  return <Screen keyboardAware safeTop={mode === 'sign-in'} contentStyle={styles.page}>
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{details.eyebrow}</Text>
      <Text accessibilityRole="header" style={styles.title}>{details.title}</Text>
      <Text style={styles.body}>{details.body}</Text>
      <Text style={styles.trustNote}>Kết nối chỉ được tạo khi cả hai cùng đồng ý.</Text>
    </View>
    <View style={styles.form}>
      <AppTextField label="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address"
        placeholder="ban@example.com" value={email} onChangeText={setEmail} error={errors.email} />
      {needsPassword ? <AppTextField label="Mật khẩu" autoCapitalize="none"
        autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} placeholder="Tối thiểu 8 ký tự"
        secureTextEntry value={password} onChangeText={setPassword} error={errors.password} /> : null}
      {mode === 'sign-up' ? <>
        <AppButton label={ageConfirmed ? 'Đã xác nhận: Tôi từ 18 tuổi' : 'Xác nhận tôi từ 18 tuổi'}
          variant="secondary" onPress={() => setAgeConfirmed((value) => !value)} />
        {errors.age ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.age}</Text> : null}
      </> : null}
      {actionError || bootstrapError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{actionError ?? bootstrapError}</Text> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
      <AppButton disabled={busy} label={busy ? 'Đang xử lý…' : details.submit} onPress={() => void submit()} />
      {mode === 'sign-in' ? <>
        <AppButton label="Quên mật khẩu" variant="quiet" onPress={() => navigation.navigate('ForgotPassword')} />
        <AppButton label="Tạo tài khoản mới" variant="secondary" onPress={() => navigation.navigate('SignUp')} />
      </> : <AppButton label="Quay lại đăng nhập" variant="quiet"
        onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('SignIn')} />}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  page: { justifyContent: 'center' }, hero: { gap: spacing.sm, marginBottom: spacing.md },
  eyebrow: { ...type.label, color: colors.primaryPressed, textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { ...type.display, color: colors.ink }, body: { ...type.body, color: colors.inkMuted },
  trustNote: { ...type.label, color: colors.primaryPressed, borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: spacing.sm },
  form: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  error: { ...type.caption, color: colors.danger }, notice: { ...type.body, color: colors.success },
});
