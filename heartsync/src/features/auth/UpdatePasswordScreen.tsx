import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AppButton } from '../../shared/components/AppButton';
import { AppTextField } from '../../shared/components/AppTextField';
import { Screen } from '../../shared/components/Screen';
import { colors, spacing, type } from '../../shared/theme/tokens';
import { useAuth } from './AuthProvider';
import { validatePassword } from './validation';

export function UpdatePasswordScreen() {
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!validatePassword(password)) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    setBusy(true); setError(undefined); setNotice(undefined);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.ok) setNotice(result.notice);
    else setError(result.message);
  };

  return <Screen safeTop keyboardAware contentStyle={styles.page}>
    <Text accessibilityRole="header" style={styles.title}>Đặt mật khẩu mới</Text>
    <Text style={styles.body}>Liên kết khôi phục đã được xác nhận. Chọn mật khẩu mới cho tài khoản này.</Text>
    <AppTextField label="Mật khẩu mới" secureTextEntry autoComplete="new-password" value={password}
      onChangeText={setPassword} error={error} />
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
    <AppButton label={busy ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'} disabled={busy} onPress={() => void submit()} />
    <AppButton label="Hủy và đăng xuất" variant="quiet" onPress={() => void signOut()} />
  </Screen>;
}
const styles = StyleSheet.create({
  page: { justifyContent: 'center' }, title: { ...type.display, color: colors.ink },
  body: { ...type.body, color: colors.inkMuted, marginBottom: spacing.md },
  notice: { ...type.body, color: colors.success },
});
