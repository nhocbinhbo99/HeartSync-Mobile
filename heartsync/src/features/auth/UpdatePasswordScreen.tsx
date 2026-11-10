import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../../shared/components/AppButton';
import { AppTextField } from '../../shared/components/AppTextField';
import { IconButton } from '../../shared/components/IconButton';
import { Screen } from '../../shared/components/Screen';
import { useSnackbar } from '../../shared/components/Snackbar';
import { spacing } from '../../shared/theme/tokens';
import { useAuth } from './AuthProvider';
import { validatePassword } from './validation';
import { AuthHeader } from './AuthHeader';
import { AuthNotice } from './AuthNotice';

export function UpdatePasswordScreen() {
  const { updatePassword, signOut } = useAuth();
  const snackbar = useSnackbar();
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!validatePassword(password)) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      snackbar.show({ message: 'Mật khẩu cần có ít nhất 8 ký tự.', tone: 'error' });
      return;
    }
    setBusy(true); setError(undefined); setNotice(undefined);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.ok) { const message = result.notice ?? 'Mật khẩu đã được cập nhật.'; setNotice(message); snackbar.show({ message, tone: 'success' }); }
    else { setError(result.message); snackbar.show({ message: result.message, tone: 'error' }); }
  };

  return <Screen safeTop keyboardAware contentStyle={styles.page}>
    <AuthHeader title="Đặt mật khẩu mới" body="Liên kết khôi phục đã được xác nhận. Chọn mật khẩu mới cho tài khoản này." />
    <View style={styles.form}>
      <AppTextField label="Mật khẩu mới" secureTextEntry={!visible} autoComplete="new-password" value={password}
        onChangeText={setPassword} error={error} rightAccessory={<IconButton icon={visible ? 'eyeOff' : 'eye'} label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setVisible((current) => !current)} />} />
      {notice ? <AuthNotice tone="success" message={notice} /> : null}
      <AppButton label={busy ? 'Đang cập nhật' : 'Cập nhật mật khẩu'} loading={busy} trailingIcon="check" disabled={busy} onPress={() => void submit()} />
      <AppButton label="Hủy và đăng xuất" variant="quiet" leadingIcon="back" onPress={() => void signOut()} />
    </View>
  </Screen>;
}
const styles = StyleSheet.create({
  page: { justifyContent: 'center', gap: spacing.lg },
  form: { gap: spacing.md },
});
