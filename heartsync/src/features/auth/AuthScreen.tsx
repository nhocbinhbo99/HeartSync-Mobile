import { useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedSection } from '../../shared/components/AnimatedSection';
import { AnimatedPressable } from '../../shared/components/AnimatedPressable';
import { AppButton } from '../../shared/components/AppButton';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppText } from '../../shared/components/AppText';
import { AppTextField } from '../../shared/components/AppTextField';
import { DateField } from '../../shared/components/DateField';
import { FormField } from '../../shared/components/FormField';
import { IconButton } from '../../shared/components/IconButton';
import { SingleChoiceField } from '../../shared/components/ChoiceFields';
import { Screen } from '../../shared/components/Screen';
import { useSnackbar } from '../../shared/components/Snackbar';
import { feedback } from '../../shared/motion/feedback';
import { GENDER_OPTIONS } from '../../shared/domain/profileOptions';
import { colors, fonts, spacing, type } from '../../shared/theme/tokens';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from './AuthProvider';
import { validateAuthFields, validateSignUpFields, type AuthFieldErrors } from './validation';
import { AuthHeader } from './AuthHeader';
import { AuthNotice } from './AuthNotice';

type AuthRoute = 'SignIn' | 'SignUp' | 'ForgotPassword';
type Props = NativeStackScreenProps<RootStackParamList, AuthRoute> & {
  mode: 'sign-in' | 'sign-up' | 'forgot-password';
};

const copy = {
  'sign-in': {
    title: 'Chào mừng trở lại! 👋',
    body: 'Tiếp tục kết nối với HeartSync',
    submit: 'Đăng nhập',
  },
  'sign-up': {
    title: 'Tạo tài khoản',
    body: 'Bắt đầu hành trình kết nối cùng HeartSync',
    submit: 'Đăng ký',
  },
  'sign-up-details': {
    title: 'Giới thiệu bản thân',
    body: 'Ngày sinh luôn riêng tư. Thông tin này giúp gợi ý đúng những người phù hợp.',
    submit: 'Hoàn tất đăng ký',
  },
  'forgot-password': {
    title: 'Khôi phục tài khoản',
    body: 'Nhập email của bạn để nhận liên kết đặt lại mật khẩu.',
    submit: 'Gửi liên kết',
  },
} as const;

function PasswordAccessory({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  return (
    <IconButton
      icon={visible ? 'eyeOff' : 'eye'}
      label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      onPress={onPress}
    />
  );
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Tiến trình tạo tài khoản"
      accessibilityValue={{ min: 1, max: 2, now: step }}
      style={styles.stepper}
    >
      <View style={[styles.stepCircle, styles.stepCircleDone]}>
        <AppIcon name="check" color={colors.onPrimary} size={14} />
      </View>
      <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
      <View style={[styles.stepCircle, step === 2 && styles.stepCircleDone]}>
        <AppText style={[styles.stepNum, step === 2 && styles.stepNumActive]}>2</AppText>
      </View>
    </View>
  );
}

export function AuthScreen({ navigation, mode }: Props) {
  const {
    signIn,
    signUp,
    requestPasswordReset,
    bootstrapError,
    pendingSignInEmail,
    pendingSignInNotice,
    clearPendingSignInNotice,
  } = useAuth();
  const snackbar = useSnackbar();
  const [email, setEmail] = useState(() => (mode === 'sign-in' && pendingSignInEmail ? pendingSignInEmail : ''));
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [actionError, setActionError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const needsPassword = mode !== 'forgot-password';
  const isSignUp = mode === 'sign-up';
  const details = isSignUp && step === 2 ? copy['sign-up-details'] : copy[mode];
  const effectiveNotice = notice ?? (mode === 'sign-in' ? pendingSignInNotice : undefined);

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
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !agreedToTerms) {
      if (!agreedToTerms) {
        setActionError('Hãy đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư để tiếp tục.');
      }
      feedback('error');
      return;
    }
    feedback('selection');
    setStep(2);
  };

  const submit = async () => {
    if (isSignUp && step === 1) {
      goToProfileStep();
      return;
    }
    const nextErrors = isSignUp
      ? validateSignUpFields({
          email,
          password,
          passwordConfirm: password,
          displayName,
          dateOfBirth,
          gender,
        })
      : validateAuthFields(email, needsPassword ? password : undefined);
    setErrors(nextErrors);
    setActionError(undefined);
    setNotice(undefined);
    clearPendingSignInNotice?.();
    if (Object.keys(nextErrors).length) {
      feedback('error');
      return;
    }
    setBusy(true);
    try {
      const result =
        mode === 'sign-in'
          ? await signIn(email.trim(), password)
          : isSignUp
            ? await signUp({
                email: email.trim(),
                password,
                displayName: displayName.trim(),
                dateOfBirth,
                gender,
              })
            : await requestPasswordReset(email.trim());
      if (result.ok) {
        if (mode === 'sign-in') {
          feedback('selection');
          return;
        }
        const message = result.notice ?? (isSignUp ? 'Đăng ký thành công! Vui lòng đăng nhập.' : 'Thao tác đã hoàn tất.');
        setNotice(message);
        snackbar.show({ message, tone: 'success' });
        if (isSignUp && result.notice) {
          feedback('confirm');
          setStep(1);
          navigation.navigate('SignIn');
        }
      } else {
        setActionError(result.message);
        snackbar.show({ message: result.message, tone: 'error' });
        feedback('error');
      }
    } catch {
      const fallbackMsg = 'Không thể hoàn tất yêu cầu lúc này. Vui lòng thử lại.';
      setActionError(fallbackMsg);
      snackbar.show({ message: fallbackMsg, tone: 'error' });
      feedback('error');
    } finally {
      setBusy(false);
    }
  };

  const submitLabel = isSignUp && step === 1 ? 'Đăng ký' : details.submit;
  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.replace('SignIn'));

  return (
    <Screen keyboardAware safeTop contentStyle={styles.page}>
      {mode !== 'sign-in' ? (
        <IconButton icon="back" label="Quay lại" onPress={goBack} style={styles.backButton} />
      ) : null}
      <AuthHeader
        title={details.title}
        body={details.body}
        align={isSignUp ? 'left' : 'center'}
      />
      {isSignUp ? <StepIndicator step={step} /> : null}

      <View style={styles.form}>
        {!isSignUp || step === 1 ? (
          <AnimatedSection>
            <View style={styles.formGroup}>
              {isSignUp ? (
                <AppTextField
                  label="Tên hiển thị"
                  placeholder="Nhập tên của bạn"
                  value={displayName}
                  onChangeText={setDisplayName}
                  error={errors.displayName}
                />
              ) : null}
              <AppTextField
                label="Email"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                placeholder="Nhập email của bạn"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
              />
              {needsPassword ? (
                <AppTextField
                  label="Mật khẩu"
                  autoCapitalize="none"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  placeholder={isSignUp ? 'Ít nhất 8 ký tự, gồm chữ hoa, thường và số' : 'Nhập mật khẩu'}
                  secureTextEntry={!passwordVisible}
                  value={password}
                  onChangeText={setPassword}
                  error={errors.password}
                  rightAccessory={
                    <PasswordAccessory
                      visible={passwordVisible}
                      onPress={() => setPasswordVisible((value) => !value)}
                    />
                  }
                />
              ) : null}

              {mode === 'sign-in' ? (
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Quên mật khẩu"
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.forgotLinkWrap}
                >
                  <AppText style={styles.forgotLinkText}>Quên mật khẩu?</AppText>
                </AnimatedPressable>
              ) : null}
            </View>
          </AnimatedSection>
        ) : (
          <AnimatedSection>
            <View style={styles.formGroup}>
              {!displayName.trim() ? (
                <FormField
                  label="Tên hiển thị"
                  value={displayName}
                  onChangeText={setDisplayName}
                  maxLength={80}
                  showCharacterCount
                  error={errors.displayName}
                  placeholder="Tên mọi người sẽ nhìn thấy"
                />
              ) : null}
              <DateField
                label="Ngày sinh"
                value={dateOfBirth}
                onChange={setDateOfBirth}
                maximumDate={dateLimits.maximum}
                minimumDate={dateLimits.minimum}
                error={errors.dateOfBirth}
              />
              <SingleChoiceField
                label="Giới tính"
                options={GENDER_OPTIONS}
                value={gender}
                onChange={setGender}
                error={errors.gender}
                searchable={false}
              />
            </View>
          </AnimatedSection>
        )}

        {actionError || bootstrapError ? (
          <AuthNotice tone="error" message={actionError ?? bootstrapError ?? ''} />
        ) : null}
        {effectiveNotice ? <AuthNotice tone="success" message={effectiveNotice} /> : null}

        <AppButton
          disabled={busy}
          loading={busy}
          label={busy ? (mode === 'sign-in' ? 'Đang vào...' : 'Đang xử lý') : submitLabel}
          onPress={() => void submit()}
        />

        {isSignUp && step === 1 ? (
          <AnimatedPressable
            accessibilityRole="checkbox"
            accessibilityLabel="Đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư"
            accessibilityState={{ checked: agreedToTerms }}
            onPress={() => {
              setAgreedToTerms((value) => !value);
              setActionError(undefined);
            }}
            style={styles.termsCentered}
          >
            <Text style={styles.termsNoteText}>
              Bằng việc đăng ký, bạn đồng ý với{'\n'}
              <Text style={styles.termsLink}>Điều khoản sử dụng</Text> và{' '}
              <Text style={styles.termsLink}>Chính sách bảo mật</Text>.
            </Text>
          </AnimatedPressable>
        ) : null}

        {isSignUp && step === 2 ? (
          <AppButton
            label="Quay lại bước trước"
            variant="quiet"
            leadingIcon="back"
            disabled={busy}
            onPress={() => setStep(1)}
          />
        ) : null}

        {mode === 'sign-in' ? (
          <View style={styles.signInFooter}>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Tạo tài khoản"
              onPress={() => navigation.navigate('SignUp')}
              style={styles.registerPromptRow}
            >
              <AppText tone="muted" style={styles.registerPromptText}>
                Chưa có tài khoản?{' '}
              </AppText>
              <AppText style={styles.registerPromptLink}>Đăng ký ngay</AppText>
            </AnimatedPressable>
          </View>
        ) : !isSignUp ? (
          <AppButton label="Quay lại đăng nhập" variant="quiet" leadingIcon="back" onPress={goBack} />
        ) : null}
      </View>

      <View style={styles.trustNote}>
        <AppIcon name="lock" color={colors.primaryPressed} size={14} />
        <Text style={styles.trustText}>Kết nối chỉ được tạo khi cả hai cùng đồng ý.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    justifyContent: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    backgroundColor: '#FFF7F9',
  },
  backButton: { alignSelf: 'flex-start', marginLeft: -spacing.xs, marginBottom: -spacing.xs },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 4,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F7DCE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: {
    backgroundColor: colors.primaryPressed,
  },
  stepLine: {
    width: 48,
    height: 2,
    backgroundColor: '#F3D0DF',
  },
  stepLineActive: {
    backgroundColor: colors.primaryPressed,
  },
  stepNum: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.inkMuted,
  },
  stepNumActive: {
    color: colors.onPrimary,
  },
  form: { gap: spacing.md },
  formGroup: { gap: spacing.sm },
  forgotLinkWrap: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  forgotLinkText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primaryPressed,
  },
  signInFooter: {
    gap: spacing.md,
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F3D6E2',
  },
  orText: {
    fontSize: 13,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  socialCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3D6E2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D67094',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  googleLetter: {
    fontFamily: fonts.extrabold,
    fontSize: 18,
    color: '#EA4335',
  },
  appleSymbol: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: '#1F1F1F',
  },
  registerPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  registerPromptText: {
    fontSize: 14,
  },
  registerPromptLink: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.primaryPressed,
  },
  termsCentered: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  termsNoteText: {
    ...type.caption,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  termsLink: {
    fontFamily: fonts.bold,
    color: colors.primaryPressed,
  },
  trustNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: spacing.xs,
  },
  trustText: { ...type.caption, color: colors.inkMuted },
});
