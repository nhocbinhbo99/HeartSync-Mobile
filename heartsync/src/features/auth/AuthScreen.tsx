import { useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedSection } from '../../shared/components/AnimatedSection';
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

type AuthRoute = 'SignIn' | 'SignUp' | 'ForgotPassword';
type Props = NativeStackScreenProps<RootStackParamList, AuthRoute> & { mode: 'sign-in' | 'sign-up' | 'forgot-password' };

const copy = {
  'sign-in': { title: 'Chào mừng trở lại', body: 'Tiếp tục những kết nối bạn đã chọn.', submit: 'Đăng nhập' },
  'sign-up': { title: 'Bắt đầu cùng HeartSync', body: 'Chỉ vài thông tin để tạo một không gian kết nối an toàn.', submit: 'Tạo tài khoản' },
  'forgot-password': { title: 'Khôi phục tài khoản', body: 'Nhập email để nhận liên kết đặt lại mật khẩu.', submit: 'Gửi liên kết' },
} as const;

function PasswordAccessory({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  return <IconButton icon={visible ? 'eyeOff' : 'eye'} label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={onPress} />;
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return <View accessibilityLabel={`Bước ${step} trên 2`} style={styles.stepper}>
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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [actionError, setActionError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const details = copy[mode];
  const needsPassword = mode !== 'forgot-password';
  const isSignUp = mode === 'sign-up';
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
    if (Object.keys(nextErrors).length) { feedback('error'); return; }
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
  return <Screen keyboardAware safeTop={mode === 'sign-in'} contentStyle={styles.page}>
    <View style={styles.hero}>
      <View style={styles.brandMark}><AppIcon name="shield" color={colors.primaryPressed} size={24} /></View>
      <Text accessibilityRole="header" style={styles.title}>{details.title}</Text>
      <Text style={styles.body}>{details.body}</Text>
      {isSignUp ? <StepIndicator step={step} /> : null}
    </View>
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
      {actionError || bootstrapError ? <FeedbackBanner tone="error" message={actionError ?? bootstrapError ?? ''} /> : null}
      {notice ? <FeedbackBanner tone="success" message={notice} /> : null}
      <AppButton disabled={busy} loading={busy} label={busy ? 'Đang xử lý' : submitLabel}
        trailingIcon={isSignUp && step === 1 ? 'forward' : 'check'} onPress={() => void submit()} />
      {isSignUp && step === 2 ? <AppButton label="Quay lại bước trước" variant="quiet" leadingIcon="back" disabled={busy} onPress={() => setStep(1)} /> : null}
      {mode === 'sign-in' ? <View style={styles.secondaryActions}>
        <AppButton label="Quên mật khẩu" variant="quiet" onPress={() => navigation.navigate('ForgotPassword')} />
        <AppButton label="Tạo tài khoản" variant="secondary" trailingIcon="forward" onPress={() => navigation.navigate('SignUp')} />
      </View> : !isSignUp || step === 1 ? <AppButton label="Quay lại đăng nhập" variant="quiet" leadingIcon="back"
        onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('SignIn')} /> : null}
    </View>
    {mode === 'sign-in' ? <View style={styles.trustNote}><AppIcon name="lock" color={colors.primaryPressed} size={18} /><Text style={styles.trustText}>Kết nối chỉ được tạo khi cả hai cùng đồng ý.</Text></View> : null}
  </Screen>;
}

function FeedbackBanner({ tone, message }: { tone: 'success' | 'error'; message: string }) {
  const color = tone === 'success' ? colors.success : colors.danger;
  return <View accessibilityLiveRegion="polite" style={[styles.feedback, { borderColor: color }]}>
    <AppIcon name={tone === 'success' ? 'checkCircle' : 'error'} color={color} size={20} />
    <Text style={[styles.feedbackText, { color }]}>{message}</Text>
  </View>;
}

const styles = StyleSheet.create({
  page: { justifyContent: 'center', paddingVertical: spacing.xl },
  hero: { gap: spacing.xs, marginBottom: spacing.lg },
  brandMark: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  title: { ...type.display, color: colors.ink },
  body: { ...type.body, color: colors.inkMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  stepSegment: { height: 4, flex: 1, backgroundColor: colors.border, borderRadius: radii.pill },
  stepActive: { backgroundColor: colors.primary },
  stepLabel: { ...type.caption, color: colors.inkMuted, marginLeft: spacing.xs },
  form: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  formGroup: { gap: spacing.md },
  secondaryActions: { gap: spacing.xs },
  feedback: { borderWidth: 1, borderRadius: radii.md, padding: spacing.sm, gap: spacing.xs, flexDirection: 'row', alignItems: 'flex-start' },
  feedbackText: { ...type.caption, flex: 1 },
  trustNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, paddingHorizontal: spacing.sm },
  trustText: { ...type.caption, color: colors.inkMuted, flex: 1 },
});
