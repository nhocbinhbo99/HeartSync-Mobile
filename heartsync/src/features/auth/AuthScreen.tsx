import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../shared/components/AppButton';
import { AppTextField } from '../../shared/components/AppTextField';
import { Screen } from '../../shared/components/Screen';
import { colors, radii, spacing, type } from '../../shared/theme/tokens';
import type { RootStackParamList } from '../../navigation/types';

type AuthRoute = 'SignIn' | 'SignUp' | 'ForgotPassword';
type Props = NativeStackScreenProps<RootStackParamList, AuthRoute> & { mode: 'sign-in' | 'sign-up' | 'forgot-password' };

const copy = {
  'sign-in': { eyebrow: 'HeartSync', title: 'Chào mừng bạn trở lại', body: 'Đăng nhập để tiếp tục những kết nối đã được xác nhận.', submit: 'Đăng nhập' },
  'sign-up': { eyebrow: 'Tạo tài khoản', title: 'Bắt đầu có chủ đích', body: 'Chỉ dành cho người dùng từ 18 tuổi. Xác thực thật sẽ được nối ở Q02.', submit: 'Tạo tài khoản' },
  'forgot-password': { eyebrow: 'Khôi phục', title: 'Lấy lại quyền truy cập', body: 'Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.', submit: 'Gửi liên kết' },
} as const;

export function AuthScreen({ navigation, mode }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const details = copy[mode];
  const needsPassword = mode !== 'forgot-password';

  return <Screen keyboardAware safeTop={mode === 'sign-in'} contentStyle={styles.page}>
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{details.eyebrow}</Text>
      <Text accessibilityRole="header" style={styles.title}>{details.title}</Text>
      <Text style={styles.body}>{details.body}</Text>
      <Text style={styles.trustNote}>Kết nối chỉ được tạo khi cả hai cùng đồng ý.</Text>
    </View>
    <View style={styles.form}>
      <AppTextField label="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address"
        placeholder="ban@example.com" value={email} onChangeText={setEmail} />
      {needsPassword ? <AppTextField label="Mật khẩu" autoCapitalize="none"
        autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} placeholder="Tối thiểu 8 ký tự"
        secureTextEntry value={password} onChangeText={setPassword} /> : null}
      <AppButton disabled label={`${details.submit} — có ở Q02`} onPress={() => undefined} />
      {mode === 'sign-in' ? <>
        <AppButton label="Quên mật khẩu" variant="quiet" onPress={() => navigation.navigate('ForgotPassword')} />
        <AppButton label="Tạo tài khoản mới" variant="secondary" onPress={() => navigation.navigate('SignUp')} />
        <View style={styles.preview}>
          <Text style={styles.previewText}>Chế độ phát triển Q01: chỉ xem navigation shell, không tạo phiên đăng nhập.</Text>
          <AppButton label="Xem trước application shell" variant="quiet" onPress={() => navigation.replace('MainTabs')} />
        </View>
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
  preview: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.xs },
  previewText: { ...type.caption, color: colors.inkMuted, textAlign: 'center' },
});
