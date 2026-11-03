import { useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../shared/components/AppButton';
import { AppTextField } from '../../shared/components/AppTextField';
import { DateField } from '../../shared/components/DateField';
import { FormField } from '../../shared/components/FormField';
import { SingleChoiceField } from '../../shared/components/ChoiceFields';
import { Screen } from '../../shared/components/Screen';
import { GENDER_OPTIONS } from '../../shared/domain/profileOptions';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from './AuthProvider';
import { validateAuthFields, validateSignUpFields, type AuthFieldErrors } from './validation';

type AuthRoute = 'SignIn' | 'SignUp' | 'ForgotPassword';
type Props = NativeStackScreenProps<RootStackParamList, AuthRoute> & { mode: 'sign-in' | 'sign-up' | 'forgot-password' };

const copy = {
  'sign-in': { title: 'Chào mừng bạn trở lại', body: 'Đăng nhập để tiếp tục những kết nối đã được xác nhận.', submit: 'Đăng nhập' },
  'sign-up': { title: 'Tạo tài khoản HeartSync', body: 'Thông tin cơ bản giúp xác minh độ tuổi và chuẩn bị hồ sơ của bạn.', submit: 'Tạo tài khoản' },
  'forgot-password': { title: 'Lấy lại quyền truy cập', body: 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.', submit: 'Gửi liên kết' },
} as const;

function PasswordAccessory({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
    onPress={onPress} style={styles.passwordAction}>
    <Text style={styles.passwordActionText}>{visible ? 'Ẩn' : 'Hiện'}</Text>
  </Pressable>;
}

export function AuthScreen({ navigation, mode }: Props) {
  const { signIn, signUp, requestPasswordReset, bootstrapError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [actionError, setActionError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const details = copy[mode];
  const needsPassword = mode !== 'forgot-password';
  const dateLimits = useMemo(() => {
    const maximum = new Date();
    maximum.setHours(0, 0, 0, 0);
    maximum.setFullYear(maximum.getFullYear() - 18);
    const minimum = new Date(maximum);
    minimum.setFullYear(minimum.getFullYear() - 102);
    return { maximum, minimum };
  }, []);

  const submit = async () => {
    const nextErrors = mode === 'sign-up'
      ? validateSignUpFields({ email, password, passwordConfirm, displayName, dateOfBirth, gender })
      : validateAuthFields(email, needsPassword ? password : undefined);
    setErrors(nextErrors);
    setActionError(undefined);
    setNotice(undefined);
    if (Object.keys(nextErrors).length > 0) return;
    setBusy(true);
    const result = mode === 'sign-in'
      ? await signIn(email, password)
      : mode === 'sign-up'
        ? await signUp({ email, password, displayName, dateOfBirth, gender })
        : await requestPasswordReset(email);
    setBusy(false);
    if (result.ok) setNotice(result.notice);
    else setActionError(result.message);
  };

  return <Screen keyboardAware safeTop={mode === 'sign-in'} contentStyle={styles.page}>
    <View style={styles.hero}>
      <Text accessibilityRole="header" style={styles.title}>{details.title}</Text>
      <Text style={styles.body}>{details.body}</Text>
      <View style={styles.trustNote}><Text style={styles.trustText}>Kết nối chỉ được tạo khi cả hai cùng đồng ý.</Text></View>
    </View>
    <View style={styles.form}>
      <AppTextField label="Email" autoCapitalize="none" autoCorrect={false} autoComplete="email"
        keyboardType="email-address" placeholder="ban@example.com" value={email} onChangeText={setEmail} error={errors.email} />
      {mode === 'sign-up' ? <>
        <FormField label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} maxLength={80}
          showCharacterCount error={errors.displayName} placeholder="Tên mọi người sẽ nhìn thấy" />
        <DateField label="Ngày sinh" value={dateOfBirth} onChange={setDateOfBirth}
          maximumDate={dateLimits.maximum} minimumDate={dateLimits.minimum} error={errors.dateOfBirth} />
        <SingleChoiceField label="Giới tính" options={GENDER_OPTIONS} value={gender} onChange={setGender}
          error={errors.gender} searchable={false} />
      </> : null}
      {needsPassword ? <AppTextField label="Mật khẩu" autoCapitalize="none"
        autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} placeholder="Tối thiểu 8 ký tự"
        secureTextEntry={!passwordVisible} value={password} onChangeText={setPassword} error={errors.password}
        rightAccessory={<PasswordAccessory visible={passwordVisible} onPress={() => setPasswordVisible((value) => !value)} />} /> : null}
      {mode === 'sign-up' ? <AppTextField label="Xác nhận mật khẩu" autoCapitalize="none" autoComplete="new-password"
        placeholder="Nhập lại mật khẩu" secureTextEntry={!passwordVisible} value={passwordConfirm}
        onChangeText={setPasswordConfirm} error={errors.passwordConfirm} /> : null}
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
  page: { justifyContent: 'center' },
  hero: { gap: spacing.sm, marginBottom: spacing.md },
  title: { ...type.display, color: colors.ink },
  body: { ...type.body, color: colors.inkMuted },
  trustNote: { backgroundColor: colors.primarySoft, borderRadius: radii.md, padding: spacing.sm },
  trustText: { ...type.label, color: colors.primaryPressed },
  form: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  passwordAction: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  passwordActionText: { ...type.label, color: colors.primaryPressed },
  error: { ...type.caption, color: colors.danger },
  notice: { ...type.body, color: colors.success },
});
