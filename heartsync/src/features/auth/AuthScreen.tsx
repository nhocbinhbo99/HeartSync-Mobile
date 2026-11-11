import { useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedSection } from '../../shared/components/AnimatedSection';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppTextField } from '../../shared/components/AppTextField';
import { DateField } from '../../shared/components/DateField';
import { FormField } from '../../shared/components/FormField';
import { IconButton } from '../../shared/components/IconButton';
import { SingleChoiceField } from '../../shared/components/ChoiceFields';
import { Screen } from '../../shared/components/Screen';
import { useSnackbar } from '../../shared/components/Snackbar';
import { feedback } from '../../shared/motion/feedback';
import { GENDER_OPTIONS } from '../../shared/domain/profileOptions';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from './AuthProvider';
import { validateAuthFields, validateSignUpFields, type AuthFieldErrors } from './validation';
import { AuthHeader } from './AuthHeader';
import { AuthNotice } from './AuthNotice';

type AuthRoute = 'SignIn' | 'SignUp' | 'ForgotPassword';
type Props = NativeStackScreenProps<RootStackParamList, AuthRoute> & { mode: 'sign-in' | 'sign-up' | 'forgot-password' };

const copy = {
  'sign-in': { title: 'Mừng bạn trở lại.', body: 'Một cuộc gặp thú vị có thể bắt đầu hôm nay.', submit: 'Đăng nhập' },
  'sign-up': { title: 'Tạo tài khoản', body: 'Bắt đầu bằng những điều cơ bản.', submit: 'Tạo tài khoản' },
  'sign-up-details': { title: 'Thông tin cơ bản', body: 'Ngày sinh luôn riêng tư. Chúng tôi dùng thông tin này để giữ trải nghiệm phù hợp và an toàn.', submit: 'Tạo tài khoản' },
  'forgot-password': { title: 'Khôi phục tài khoản', body: 'Nhập email để nhận liên kết đặt lại mật khẩu.', submit: 'Gửi liên kết' },
} as const;

function PasswordAccessory({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  return <IconButton icon={visible ? 'eyeOff' : 'eye'} label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={onPress} />;
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return <View accessibilityRole="progressbar" accessibilityLabel="Tiến trình tạo tài khoản"
    accessibilityValue={{ min: 1, max: 2, now: step }} style={styles.stepper}>
    <View style={[styles.stepSegment, styles.stepActive]} />
    <View style={[styles.stepSegment, step === 2 && styles.stepActive]} />
    <Text style={styles.stepLabel}>Bước {step}/2</Text>
  </View>;
}

export function AuthScreen({ navigation, mode }: Props) {
  const { signIn, signUp, requestPasswordReset, bootstrapError } = useAuth();
  const snackbar = useSnackbar();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [actionError, setActionError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const needsPassword = mode !== 'forgot-password';
  const isSignUp = mode === 'sign-up';
  const details = isSignUp && step === 2 ? copy['sign-up-details'] : copy[mode];
  const dateLimits = useMemo(() => {
    const maximum = new Date();
    maximum.setHours(0, 0, 0, 0);
    maximum.setFullYear(maximum.getFullYear() - 18);
    const minimum = new Date(maximum);
    minimum.setFullYear(minimum.getFullYear() - 102);
    return { maximum, minimum };
  }, []);

  const goToProfileStep = () => {
    const nextErrors = validateAuthFields(email, password);
    if (password !== passwordConfirm) nextErrors.passwordConfirm = 'Mật khẩu xác nhận chưa khớp.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !agreedToTerms) {
      if (!agreedToTerms) setActionError('Hãy đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư để tiếp tục.');
      feedback('error');
      return;
    }
    feedback('selection');
    setStep(2);
  };

  const submit = async () => {
    if (isSignUp && step === 1) { goToProfileStep(); return; }
    const nextErrors = isSignUp
      ? validateSignUpFields({ email, password, passwordConfirm, displayName, dateOfBirth, gender })
      : validateAuthFields(email, needsPassword ? password : undefined);
    setErrors(nextErrors);
    setActionError(undefined);
    setNotice(undefined);
    if (Object.keys(nextErrors).length) { feedback('error'); return; }
    setBusy(true);
    const result = mode === 'sign-in'
      ? await signIn(email.trim(), password)
      : isSignUp
        ? await signUp({ email: email.trim(), password, displayName: displayName.trim(), dateOfBirth, gender })
        : await requestPasswordReset(email.trim());
    setBusy(false);
    if (result.ok) {
      const message = result.notice ?? 'Thao tác đã hoàn tất.';
      setNotice(message);
      snackbar.show({ message, tone: 'success' });
    } else {
      setActionError(result.message);
      snackbar.show({ message: result.message, tone: 'error' });
    }
  };

  const submitLabel = isSignUp && step === 1 ? 'Tiếp tục' : details.submit;
  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.replace('SignIn');

  return <Screen keyboardAware safeTop contentStyle={styles.page}>
    {mode !== 'sign-in' ? <IconButton icon="back" label="Quay lại" onPress={goBack} style={styles.backButton} /> : null}
    <AuthHeader title={details.title} body={details.body} />
    {isSignUp ? <StepIndicator step={step} /> : null}
    <View style={styles.form}>
      {(!isSignUp || step === 1) ? <AnimatedSection>
        <View style={styles.formGroup}>
          <AppTextField label="Email" autoCapitalize="none" autoCorrect={false} autoComplete="email"
            keyboardType="email-address" placeholder="ban@example.com" value={email} onChangeText={setEmail} error={errors.email} />
          {needsPassword ? <AppTextField label="Mật khẩu" autoCapitalize="none"
            autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder="Tối thiểu 8 ký tự"
            secureTextEntry={!passwordVisible} value={password} onChangeText={setPassword} error={errors.password}
            rightAccessory={<PasswordAccessory visible={passwordVisible} onPress={() => setPasswordVisible((value) => !value)} />} /> : null}
          {isSignUp ? <AppTextField label="Xác nhận mật khẩu" autoCapitalize="none" autoComplete="new-password"
            placeholder="Nhập lại mật khẩu" secureTextEntry={!passwordVisible} value={passwordConfirm}
            onChangeText={setPasswordConfirm} error={errors.passwordConfirm}
            rightAccessory={<PasswordAccessory visible={passwordVisible} onPress={() => setPasswordVisible((value) => !value)} />} /> : null}
          {isSignUp ? <AnimatedPressable accessibilityRole="checkbox" accessibilityLabel="Đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư"
            accessibilityState={{ checked: agreedToTerms }} onPress={() => { setAgreedToTerms((value) => !value); setActionError(undefined); }} style={styles.terms}>
            <View pointerEvents="none" accessible={false} style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms ? <AppIcon name="check" color={colors.onPrimary} size={16} /> : null}
            </View>
            <Text style={styles.termsText}>Tôi đồng ý với <Text style={styles.termsLink}>Điều khoản sử dụng</Text>{'\n'}và <Text style={styles.termsLink}>Chính sách quyền riêng tư</Text>.</Text>
          </AnimatedPressable> : null}
        </View>
      </AnimatedSection> : <AnimatedSection>
        <View style={styles.formGroup}>
          <FormField label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} maxLength={80}
            showCharacterCount error={errors.displayName} placeholder="Tên mọi người sẽ nhìn thấy" />
          <DateField label="Ngày sinh riêng tư" value={dateOfBirth} onChange={setDateOfBirth}
            maximumDate={dateLimits.maximum} minimumDate={dateLimits.minimum} error={errors.dateOfBirth} />
          <SingleChoiceField label="Giới tính" options={GENDER_OPTIONS} value={gender} onChange={setGender}
            error={errors.gender} searchable={false} />
        </View>
      </AnimatedSection>}
      {actionError || bootstrapError ? <AuthNotice tone="error" message={actionError ?? bootstrapError ?? ''} /> : null}
      {notice ? <AuthNotice tone="success" message={notice} /> : null}
      <AppButton disabled={busy} loading={busy} label={busy ? 'Đang xử lý' : submitLabel}
        trailingIcon={isSignUp && step === 1 ? 'forward' : 'check'} onPress={() => void submit()} />
      {isSignUp && step === 2 ? <AppButton label="Quay lại bước trước" variant="quiet" leadingIcon="back" disabled={busy} onPress={() => setStep(1)} /> : null}
      {mode === 'sign-in' ? <View style={styles.secondaryActions}>
        <AppButton label="Quên mật khẩu" variant="quiet" onPress={() => navigation.navigate('ForgotPassword')} />
        <View style={styles.divider} />
        <AppButton label="Tạo tài khoản" variant="secondary" trailingIcon="forward" onPress={() => navigation.navigate('SignUp')} />
      </View> : !isSignUp || step === 1 ? <AppButton label="Quay lại đăng nhập" variant="quiet" leadingIcon="back"
        onPress={goBack} /> : null}
    </View>
    {mode === 'sign-in' ? <View style={styles.trustNote}>
      <Text style={styles.trustText}>Kết nối chỉ được tạo khi cả hai cùng đồng ý.</Text>
    </View> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  page: { justifyContent: 'flex-start', paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  backButton: { alignSelf: 'flex-start', marginLeft: -spacing.xs },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: -spacing.sm },
  stepSegment: { height: 4, flex: 1, backgroundColor: colors.border, borderRadius: radii.pill },
  stepActive: { backgroundColor: colors.primary },
  stepLabel: { ...type.caption, color: colors.inkMuted, marginLeft: spacing.xs },
  form: { gap: spacing.md },
  formGroup: { gap: spacing.md },
  secondaryActions: { gap: spacing.xs, marginTop: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  trustNote: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  trustText: { ...type.caption, color: colors.inkMuted, flex: 1 },
  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.xs },
  checkbox: { width: 28, height: 28, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  termsText: { ...type.body, color: colors.ink, flex: 1 },
  termsLink: { color: colors.primaryPressed, fontWeight: '600' },
});
